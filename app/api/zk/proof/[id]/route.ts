import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../../../lib/rate-limit";
import { getProof } from "../../../../../lib/zk-db";
import { isTestnetChain } from "../../../../../lib/zk";

/** Raw proof for inspection/download. Revoked proofs stay visible, marked REVOKED. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await checkRateLimit(`zk-proof:${clientIp(req)}`, 30, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const p = await getProof(id);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      id: p.id,
      handle: p.handle,
      wallet: p.wallet,
      token: p.token,
      chainId: p.chain_id,
      sessionId: p.session_id,
      verifiedAt: p.verified_at,
      testnet: isTestnetChain(p.chain_id),
      revoked: p.revoked_at !== null,
      revokeReason: p.revoke_reason || undefined,
      proof: p.proof_json,
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
