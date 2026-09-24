import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { getSession, getVerificationBySession } from "../../../../lib/zk-db";

export async function GET(req: Request) {
  if (!(await checkRateLimit(`zk-status:${clientIp(req)}`, 60, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const session = new URL(req.url).searchParams.get("session") ?? "";
  if (!session) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    const s = await getSession(session);
    if (!s) return NextResponse.json({ error: "unknown_or_used_session" }, { status: 404 });
    if (s.status !== "verified") {
      return NextResponse.json({ status: s.status, failReason: s.fail_reason || undefined });
    }
    const v = await getVerificationBySession(session);
    return NextResponse.json({
      status: s.status,
      handle: v?.handle,
      wallet: v?.wallet,
      token: v?.token,
      chainId: v?.chain_id,
    });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
