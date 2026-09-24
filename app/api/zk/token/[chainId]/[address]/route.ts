import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../../../../lib/rate-limit";
import { countHandleTokens, getTokenBadge } from "../../../../../../lib/zk-db";
import { isTestnetChain } from "../../../../../../lib/zk";

export async function GET(req: Request, ctx: { params: Promise<{ chainId: string; address: string }> }) {
  if (!(await checkRateLimit(`zk-token:${clientIp(req)}`, 60, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const { chainId, address } = await ctx.params;
  if (!chainId || !address) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const badge = await getTokenBadge(chainId, address);
    if (!badge) return NextResponse.json({ badge: null });
    let alsoOn = 0;
    try {
      alsoOn = await countHandleTokens(badge.handle, badge.session_id);
    } catch {
      alsoOn = 0;
    }
    return NextResponse.json({
      badge: {
        id: badge.id,
        handle: badge.handle,
        wallet: badge.wallet,
        verifiedAt: badge.verified_at,
        testnet: isTestnetChain(badge.chain_id),
        revoked: false,
        alsoVerifiedOn: alsoOn,
      },
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
