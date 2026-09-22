import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../lib/rate-limit";

// Raw body cap before JSON.parse: prompt + seed only.
export const MAX_LOGO_BODY_CHARS = 4 * 1024;
// Generated PNG/JPEG from Google, base64-decoded bytes cap.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Server-side Google image generation (Gemini image model, key stays server-side).
 * Client chain: /api/logo → pin via /api/pump-metadata (artworkOnly) → https URL.
 * No key or any failure → 502 logo_offline → client falls back to Pollinations.
 */
export async function POST(req: Request) {
  if (!(await checkRateLimit(`logo:${clientIp(req)}`, 10, 60000)).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return NextResponse.json({ error: "logo_offline" }, { status: 502 });

  const clen = Number(req.headers.get("content-length"));
  if (Number.isFinite(clen) && clen > MAX_LOGO_BODY_CHARS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (rawText.length === 0 || rawText.length > MAX_LOGO_BODY_CHARS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawText) as unknown;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const prompt = typeof (body as Record<string, unknown>).logoPrompt === "string"
    ? ((body as Record<string, unknown>).logoPrompt as string).trim().slice(0, 300)
    : "";
  if (!prompt) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const model = (process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.5-flash-image").trim() || "gemini-2.5-flash-image";
  let upstream: Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Square 1:1 crypto coin logo, no text in image: ${prompt}` }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(90000),
      },
    );
  } catch {
    return NextResponse.json({ error: "logo_offline" }, { status: 502 });
  }
  // Surface Google's reason (billing, quota, region, safety) without the key:
  // client still falls back, but the message tells the user what to fix.
  if (!upstream.ok) {
    let errText = "";
    try {
      errText = typeof upstream.text === "function" ? await upstream.text() : "";
    } catch {
      errText = "";
    }
    let detail = `HTTP ${upstream.status}`;
    try {
      const ej = JSON.parse(errText) as { error?: { code?: unknown; message?: unknown; status?: unknown } };
      const parts = [ej.error?.status ?? ej.error?.code, ej.error?.message]
        .filter((p) => typeof p === "string" || typeof p === "number")
        .join(": ");
      if (parts) detail = String(parts).slice(0, 200);
    } catch {
      if (errText.trim()) detail = errText.trim().slice(0, 200);
    }
    return NextResponse.json({ error: "logo_upstream", detail }, { status: 502 });
  }
  const data = (await upstream.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: unknown; data?: unknown } }[] } }[];
  } | null;
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const mime = part?.inlineData?.mimeType;
    const b64 = part?.inlineData?.data;
    if ((mime === "image/png" || mime === "image/jpeg") && typeof b64 === "string" && b64.length > 0) {
      let bytes: Buffer;
      try {
        bytes = Buffer.from(b64, "base64");
      } catch {
        continue;
      }
      if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) continue;
      const ext = mime === "image/png" ? "png" : "jpg";
      return NextResponse.json({ imageData: `data:${mime};base64,${b64}`, mimeType: mime, ext });
    }
  }
  return NextResponse.json({ error: "logo_offline" }, { status: 502 });
}
