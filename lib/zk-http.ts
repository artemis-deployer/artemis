import { NextResponse } from "next/server";

/** Guarded JSON body read shared by zk POST routes. Null = error already sent. */
export async function readJsonBody(
  req: Request,
  maxChars: number,
): Promise<{ body: Record<string, unknown> } | { error: NextResponse }> {
  const clen = Number(req.headers.get("content-length"));
  if (Number.isFinite(clen) && clen > maxChars) {
    return { error: NextResponse.json({ error: "bad_request" }, { status: 400 }) };
  }
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { error: NextResponse.json({ error: "bad_request" }, { status: 400 }) };
  }
  if (raw.length === 0 || raw.length > maxChars) {
    return { error: NextResponse.json({ error: "bad_request" }, { status: 400 }) };
  }
  try {
    const body = JSON.parse(raw) as unknown;
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { error: NextResponse.json({ error: "bad_request" }, { status: 400 }) };
    }
    return { body: body as Record<string, unknown> };
  } catch {
    return { error: NextResponse.json({ error: "bad_request" }, { status: 400 }) };
  }
}

export function isEvmWallet(wallet: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(wallet);
}

export function isSolanaWallet(wallet: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet);
}

/** Public base URL for the Reclaim callback (env first, request origin last). */
export function baseUrl(req: Request): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL ?? "").trim();
  if (env) return env.startsWith("http") ? env.replace(/\/$/, "") : `https://${env.replace(/\/$/, "")}`;
  return new URL(req.url).origin;
}
