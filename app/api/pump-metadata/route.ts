import { NextResponse } from "next/server";
import { checkDailyLimit, checkRateLimit, clientIp } from "../../../lib/rate-limit";

export async function POST(req: Request) {
  if (!(await checkRateLimit(`pin:${clientIp(req)}`, 10, 60000)).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  // Global daily pin cap: per-IP limits rotate away, JWT quota does not.
  if (!(await checkDailyLimit("pin:daily", 200)).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return NextResponse.json({ error: "pin_offline" }, { status: 502 });
  let body: unknown;
  try {
    body = (await req.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
  const name = str(b.name, 32);
  const symbol = str(b.symbol, 10)?.toUpperCase();
  const description = str(b.description, 500) ?? "";
  const rawImage = typeof b.image === "string" ? b.image.trim().slice(0, 2048) : "";
  const image = rawImage === "" ? undefined : rawImage;
  if (!name || !symbol) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  // Attackers burn our Pinata quota via junk pins; only https images allowed.
  if (image !== undefined && !image.startsWith("https://")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Uploaded artwork file (data URL) is pinned first; its IPFS uri becomes the image.
  let imageUri: string | undefined = image;
  const imageData = typeof b.imageData === "string" ? b.imageData : null;
  if (imageData) {
    const m = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(imageData);
    if (!m) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length === 0 || bytes.length > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const pinned = await pinFile(
      jwt,
      new File([bytes], `artwork.${m[1] === "jpeg" ? "jpg" : m[1]}`, { type: `image/${m[1]}` }),
    );
    if (!pinned) return NextResponse.json({ error: "pin_offline" }, { status: 502 });
    imageUri = pinned;
  }

  const file = new File(
    [JSON.stringify({ name, symbol, description, ...(imageUri ? { image: imageUri } : {}) })],
    "metadata.json",
    { type: "application/json" },
  );
  const uri = await pinFile(jwt, file);
  if (!uri) return NextResponse.json({ error: "pin_offline" }, { status: 502 });
  return NextResponse.json({ uri });
}

async function pinFile(jwt: string, file: File): Promise<string | null> {
  const form = new FormData();
  form.append("network", "public");
  form.append("file", file);
  let upstream: Response;
  try {
    upstream = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}` },
      body: form,
    });
  } catch {
    return null;
  }
  if (!upstream.ok) return null;
  let data: { data?: { cid?: string } };
  try {
    data = (await upstream.json()) as { data?: { cid?: string } };
  } catch {
    return null;
  }
  if (!data.data?.cid) return null;
  return `https://ipfs.io/ipfs/${data.data.cid}`;
}
