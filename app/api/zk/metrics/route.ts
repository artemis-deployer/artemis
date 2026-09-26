import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { getZkMetrics } from "../../../../lib/zk-db";
import { zkFlags } from "../../../../lib/zk-flags";

/** Operator metrics (brief A7). Token-gated; counts only, no personal data. */
export async function GET(req: Request) {
  if (!zkFlags().enabled) return NextResponse.json({ error: "zk_disabled" }, { status: 503 });
  if (!(await checkRateLimit(`zk-metrics:${clientIp(req)}`, 30, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const expected = (process.env.ZK_METRICS_TOKEN ?? "").trim();
  const url = new URL(req.url);
  const given = (url.searchParams.get("token") ?? "").trim();
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!expected || (given !== expected && bearer !== expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getZkMetrics());
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
