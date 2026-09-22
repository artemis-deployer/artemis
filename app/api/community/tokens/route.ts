import { NextResponse } from "next/server";
import { classifyAddress } from "../../../../lib/addresses";
import { isDbConfigured, listTokens, saveToken } from "../../../../lib/community-db";
import { DEVNET_RPC, MAINNET_RPC } from "../../../../lib/launcher-solana";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { verifyEvmTx, verifySolanaTx } from "../../../../lib/verify-tx";

// Raw body cap before JSON.parse: legit bodies <2KB.
export const MAX_TOKENS_BODY_CHARS = 64 * 1024;

export async function GET(req?: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  const ip = req ? clientIp(req) : "local";
  if (!(await checkRateLimit(`showcase-get:${ip}`, 60, 60000)).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  try {
    return NextResponse.json({ tokens: await listTokens() });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  if (!(await checkRateLimit(`showcase:${clientIp(req)}`, 20, 60000)).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  // JSON bomb guard: check Content-Length + raw text length BEFORE JSON.parse.
  const clen = Number(req.headers.get("content-length"));
  if (Number.isFinite(clen) && clen > MAX_TOKENS_BODY_CHARS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (raw.length === 0 || raw.length > MAX_TOKENS_BODY_CHARS) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const chainId = typeof b.chainId === "number" || typeof b.chainId === "string" ? String(b.chainId) : "";
  const address = typeof b.address === "string" ? b.address.trim() : "";
  const txHash = typeof b.txHash === "string" ? b.txHash.trim() : "";
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : "");
  if (!chainId || classifyAddress(address) === null) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!txHash) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const chainNum = Number(chainId);
  const creator = str(b.creator);
  let verified = false;
  if (chainNum === 4663 || chainNum === 46630) {
    // Creator required: optional creator lets attackers squat victim
    // addresses with touch-only txs. Our app always sends creator.
    if (!/^0x[0-9a-fA-F]{40}$/.test(creator)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    verified = await verifyEvmTx(chainNum, address, txHash, creator);
  } else if (chainId.startsWith("solana")) {
    const rpc = chainId === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC;
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(creator)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    verified = await verifySolanaTx(rpc, address, txHash, creator);
  } else {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!verified) {
    return NextResponse.json({ error: "invalid_tx" }, { status: 400 });
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
      image: typeof b.image === "string" ? b.image : "",
      tagline: typeof b.tagline === "string" ? b.tagline : "",
      description: typeof b.description === "string" ? b.description : "",
      lore: typeof b.lore === "string" ? b.lore : "",
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
