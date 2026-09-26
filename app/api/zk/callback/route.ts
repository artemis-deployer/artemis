import { NextResponse } from "next/server";
import { verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { countHandleTokens, getSession, markSession, saveVerification } from "../../../../lib/zk-db";
import { extractHandle, normalizeHandle, proofContext, proofSessionId, proofTimestampMs, ZK_PROOF_TTL_MS } from "../../../../lib/zk";
import { readJsonBody } from "../../../../lib/zk-http";
import { zkFlags } from "../../../../lib/zk-flags";

export async function POST(req: Request) {
  if (!zkFlags().enabled) return NextResponse.json({ error: "zk_disabled" }, { status: 503 });
  if (!(await checkRateLimit(`zk-cb:${clientIp(req)}`, 30, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = await readJsonBody(req, 256 * 1024);
  if ("error" in parsed) return parsed.error;
  const b = parsed.body;
  // Reclaim posts either the raw proof or { proof }.
  const proof = (b.proof ?? b) as unknown;

  async function fail(sessionId: string | null, reason: string): Promise<NextResponse> {
    if (sessionId) {
      try {
        await markSession(sessionId, "failed", reason);
      } catch {
        // Never leak DB state in the rejection path.
      }
    }
    return NextResponse.json({ error: reason }, { status: 400 });
  }

  // 1. Session must be ours and still pending (anti-replay).
  const sessionId = proofSessionId(proof);
  if (!sessionId) return NextResponse.json({ error: "unknown_or_used_session" }, { status: 400 });
  let session = null;
  try {
    session = await getSession(sessionId);
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  if (!session || session.status !== "pending") return fail(sessionId, "unknown_or_used_session");

  // 2. Cryptographic verification: attestor signatures + mandatory TEE
  // attestation (app secret binds it to us). Brief §7: TEE check is required.
  const appSecret = (process.env.RECLAIM_APP_SECRET ?? "").trim();
  const providerId = (process.env.RECLAIM_PROVIDER_ID_X ?? "").trim();
  if (!appSecret || !providerId) return fail(sessionId, "invalid_proof");
  let ok = false;
  try {
    const result = await verifyProof(proof as Proof, {
      providerId,
      teeAttestation: { appSecret },
      attestorTeeAttestation: {},
    });
    ok = result.isVerified === true && result.isTeeAttestationVerified === true;
  } catch {
    ok = false;
  }
  if (!ok) return fail(sessionId, "invalid_proof");

  // 3. Freshness (10 minutes).
  const ts = proofTimestampMs(proof);
  if (ts === null || Date.now() - ts > ZK_PROOF_TTL_MS) return fail(sessionId, "stale_proof");

  // 4. Context binding: proof must name our wallet + nonce.
  const ctx = proofContext(proof);
  let ctxMsg: Record<string, unknown> = {};
  try {
    const rawMsg = (ctx as { message?: unknown } | null)?.message;
    ctxMsg = typeof rawMsg === "string" ? (JSON.parse(rawMsg) as Record<string, unknown>) : ((rawMsg ?? {}) as Record<string, unknown>);
  } catch {
    return fail(sessionId, "wallet_mismatch");
  }
  const ctxAddr = typeof (ctx as { address?: unknown } | null)?.address === "string"
    ? String((ctx as { address?: unknown }).address)
    : typeof (ctx as { contextAddress?: unknown } | null)?.contextAddress === "string"
      ? String((ctx as { contextAddress?: unknown }).contextAddress)
      : "";
  if (!ctxAddr || ctxAddr.toLowerCase() !== session.wallet.toLowerCase()) {
    return fail(sessionId, "wallet_mismatch");
  }
  if (typeof ctxMsg.nonce !== "string" || ctxMsg.nonce !== session.nonce) {
    return fail(sessionId, "nonce_mismatch");
  }

  // 5. Proven handle.
  const handle = normalizeHandle(extractHandle(proof));
  if (!handle) return fail(sessionId, "invalid_proof");

  // 6. Atomic persist (unique session index rejects double-submit).
  try {
    await saveVerification({
      handle,
      wallet: session.wallet,
      token: session.token,
      chainId: session.chain_id,
      sessionId,
      proofJson: proof,
    });
  } catch {
    return fail(sessionId, "unknown_or_used_session");
  }
  let alsoOn = 0;
  try {
    alsoOn = await countHandleTokens(handle, sessionId);
  } catch {
    alsoOn = 0;
  }
  return NextResponse.json({ ok: true, handle, alsoVerifiedOn: alsoOn });
}
