import { NextResponse } from "next/server";
import { verifyProof, type Proof } from "@reclaimprotocol/js-sdk";
import { checkRateLimit, clientIp } from "../../../../lib/rate-limit";
import { countHandleTokens, getSession, markSession, saveVerification } from "../../../../lib/zk-db";
import { extractVerifiedHandle, isProofTimestampFresh, normalizeProofContext, proofSessionId, proofTimestampMs } from "../../../../lib/zk";
import { readJsonPayload } from "../../../../lib/zk-http";
import { zkFlags } from "../../../../lib/zk-flags";

export async function POST(req: Request) {
  if (!zkFlags().enabled) return NextResponse.json({ error: "zk_disabled" }, { status: 503 });
  if (!(await checkRateLimit(`zk-cb:${clientIp(req)}`, 30, 60000)).ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  const parsed = await readJsonPayload(req, 256 * 1024);
  if ("error" in parsed) return parsed.error;
  const body = parsed.value;
  // Reclaim posts either a proof or a one-element proof array (possibly wrapped).
  const received = typeof body === "object" && body !== null && !Array.isArray(body)
    ? ((body as Record<string, unknown>).proof ?? (body as Record<string, unknown>).proofs ?? body)
    : body;
  const proofs = Array.isArray(received) ? received : [received];
  if (proofs.length !== 1 || typeof proofs[0] !== "object" || proofs[0] === null) {
    return NextResponse.json({ error: "invalid_proof" }, { status: 400 });
  }
  const proof = proofs[0] as Proof;

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
  const sessionId = proofSessionId(proofs);
  if (!sessionId) return NextResponse.json({ error: "unknown_or_used_session" }, { status: 400 });
  let session = null;
  try {
    session = await getSession(sessionId);
  } catch {
    return NextResponse.json({ error: "db_offline" }, { status: 502 });
  }
  if (!session || session.status !== "pending") {
    return NextResponse.json({ error: "unknown_or_used_session" }, { status: 400 });
  }

  // 2. Cryptographic verification: attestor signatures + mandatory TEE
  // attestation (app secret binds it to us). Brief §7: TEE check is required.
  const appSecret = (process.env.RECLAIM_APP_SECRET ?? "").trim();
  const providerConfig = session.provider_config;
  if (
    !appSecret || !providerConfig || typeof providerConfig.providerId !== "string" ||
    typeof providerConfig.providerVersion !== "string" || !providerConfig.providerVersion ||
    !Array.isArray(providerConfig.allowedTags)
  ) return fail(sessionId, "invalid_proof");
  let ok = false;
  let trustedContext: ReturnType<typeof normalizeProofContext> = null;
  let verifiedParameters: Record<string, string> | null = null;
  try {
    const result = await verifyProof(proofs as Proof[], {
      ...providerConfig,
      teeAttestation: { appSecret },
      attestorTeeAttestation: {},
    });
    ok = result.isVerified === true && result.isTeeAttestationVerified === true && result.isAttestorTeeAttestationVerified === true;
    if (ok && result.data.length === 1) {
      trustedContext = normalizeProofContext(result.data[0].context);
      verifiedParameters = result.data[0].extractedParameters;
    } else {
      ok = false;
    }
  } catch {
    ok = false;
  }
  if (!ok) return fail(sessionId, "invalid_proof");

  // 3. Freshness (10 minutes).
  const ts = proofTimestampMs(proof);
  if (!isProofTimestampFresh(ts)) return fail(sessionId, "stale_proof");

  // 4. Context binding: proof must name our wallet + nonce.
  const ctx = trustedContext;
  const ctxMsg = ctx?.message ?? {};
  if (!ctx || ctx.address.toLowerCase() !== session.wallet.toLowerCase()) {
    return fail(sessionId, "wallet_mismatch");
  }
  if (ctx.sessionId !== sessionId || sessionId !== session.session_id) return fail(sessionId, "unknown_or_used_session");
  if (typeof ctxMsg.nonce !== "string" || ctxMsg.nonce !== session.nonce) {
    return fail(sessionId, "nonce_mismatch");
  }
  if (session.token) {
    if (!session.expected_handle || ctxMsg.token !== session.token || String(ctxMsg.chainId ?? "") !== session.chain_id || ctxMsg.expectedHandle !== session.expected_handle) {
      return fail(sessionId, "invalid_proof");
    }
  }

  // 5. Proven handle.
  const handle = extractVerifiedHandle(verifiedParameters);
  if (!handle) return fail(sessionId, "invalid_proof");
  if (session.token && handle !== session.expected_handle) return fail(sessionId, "handle_mismatch");

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
