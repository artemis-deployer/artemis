import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readJsonBody } from "../../../../lib/zk-http";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { revokeVerification } from "../../../../lib/zk-db";

function authorized(req: Request): boolean {
  const secret = (process.env.ZK_ADMIN_TOKEN ?? "").trim();
  const header = req.headers.get("authorization") ?? "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const supplied = header.slice(7);
  const expectedBytes = Buffer.from(secret);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length && timingSafeEqual(expectedBytes, suppliedBytes);
}

export async function POST(req: Request) {
  if (!process.env.ZK_ADMIN_TOKEN?.trim()) return NextResponse.json({ error: "admin_offline" }, { status: 503 });
  if (!(await checkRateLimit(`zk-revoke:${clientIp(req)}`, 10, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = await readJsonBody(req, 4 * 1024);
  if ("error" in parsed) return parsed.error;
  const id = typeof parsed.body.id === "string" ? parsed.body.id.trim() : "";
  const reason = typeof parsed.body.reason === "string" ? parsed.body.reason.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || reason.length < 3 || reason.length > 500) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  try {
    const result = await revokeVerification(id, reason);
    if (result === "not_found") return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, status: result });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
