import { NextResponse } from "next/server";
import { classifyAddress } from "../../../../lib/addresses";
import { isDbConfigured, listTokens, saveToken } from "../../../../lib/community-db";
import { DEVNET_RPC, MAINNET_RPC } from "../../../../lib/launcher-solana";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { verifyEvmTx, verifySolanaTx } from "../../../../lib/verify-tx";

export async function GET(req?: Request) {
  if (!isDbConfigured()) return NextResponse.json({ error: "db_offline" }, { status: 502 });
  const ip = req ? clientIp(req) : "local";
  if (!checkRateLimit(`showcase-get:${ip}`, 60, 60000).ok) {
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
  if (!checkRateLimit(`showcase:${clientIp(req)}`, 20, 60000).ok) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
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
    const expectedFrom = /^0x[0-9a-fA-F]{40}$/.test(creator) ? creator : undefined;
    verified = await verifyEvmTx(chainNum, address, txHash, expectedFrom);
  } else if (chainId.startsWith("solana")) {
    const rpc = chainId === "solana-mainnet" ? MAINNET_RPC : DEVNET_RPC;
    const expectedCreator = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(creator) ? creator : undefined;
    verified = await verifySolanaTx(rpc, address, txHash, expectedCreator);
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
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
