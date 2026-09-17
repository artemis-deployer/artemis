import { NextResponse } from "next/server";
import { classifyAddress } from "../../../../lib/addresses";
import { isDbConfigured, listTokens, saveToken } from "../../../../lib/community-db";

export async function GET() {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  try {
    return NextResponse.json({ tokens: await listTokens() });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const chainId = typeof b.chainId === "number" || typeof b.chainId === "string" ? String(b.chainId) : "";
  const address = typeof b.address === "string" ? b.address.trim() : "";
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");
  if (!chainId || classifyAddress(address) === null) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    await saveToken({
      chainId,
      address,
      creator: str(b.creator),
      name: str(b.name),
      symbol: str(b.symbol),
      pool: str(b.pool),
      txHash: str(b.txHash),
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
