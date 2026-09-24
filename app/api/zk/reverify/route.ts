import { NextResponse } from "next/server";
import { verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { getProof } from "../../../../lib/zk-db";
import { readJsonBody } from "../../../../lib/zk-http";

/** Re-run cryptographic verification over a stored proof. Never mutates. */
export async function POST(req: Request) {
  if (!(await checkRateLimit(`zk-reverify:${clientIp(req)}`, 10, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 4 * 1024);
  if ("error" in parsed) return parsed.error;
  const id = typeof parsed.body.id === "string" ? parsed.body.id : "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const appSecret = (process.env.RECLAIM_APP_SECRET ?? "").trim();
  const providerId = (process.env.RECLAIM_PROVIDER_ID_X ?? "").trim();
  if (!appSecret || !providerId) return NextResponse.json({ error: "zk_offline" }, { status: 502 });
  try {
    const p = await getProof(id);
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    let ok = false;
    try {
      const result = await verifyProof(p.proof_json as Proof, {
        providerId,
        teeAttestation: { appSecret },
        attestorTeeAttestation: {},
      });
      ok = result.isVerified === true && result.isTeeAttestationVerified === true;
    } catch {
      ok = false;
    }
    return NextResponse.json({ valid: ok, revoked: p.revoked_at !== null });
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
}
