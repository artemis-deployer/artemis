import postgres from "postgres";
import { isDbConfigured } from "./community-db";
import type { ProviderVersionInfo } from "@reclaimprotocol/js-sdk";

export type ZkSession = {
  session_id: string;
  wallet: string;
  token: string;
  chain_id: string;
  nonce: string;
  expected_handle: string;
  provider_config: ProviderVersionInfo;
  status: "pending" | "verified" | "failed" | "expired";
  fail_reason: string;
  created_at: string;
};

export type ZkVerification = {
  id: string;
  handle: string;
  wallet: string;
  token: string;
  chain_id: string;
  session_id: string;
  proof_json: unknown;
  verified_at: string;
  revoked_at: string | null;
  revoke_reason: string;
  provider_config?: ProviderVersionInfo;
};

let cached: ReturnType<typeof postgres> | null = null;

function sql() {
  cached ??= postgres(process.env.DATABASE_URL as string, { prepare: false });
  return cached;
}

function needDb() {
  if (!isDbConfigured()) throw new Error("db_offline");
}

/** Single-use nonce bound to a wallet. Returns false when unknown/used. */
export async function consumeNonce(nonce: string, wallet: string): Promise<boolean> {
  needDb();
  const rows = await sql()`DELETE FROM zk_nonces
    WHERE nonce = ${nonce} AND lower(wallet) = lower(${wallet})
      AND created_at >= now() - interval '5 minutes'
    RETURNING nonce`;
  return rows.length > 0;
}

export async function saveNonce(nonce: string, wallet: string): Promise<void> {
  needDb();
  await sql()`INSERT INTO zk_nonces (nonce, wallet) VALUES (${nonce}, ${wallet})
    ON CONFLICT (nonce) DO NOTHING`;
  await sql()`DELETE FROM zk_nonces WHERE created_at < now() - interval '10 minutes'`;
}

export async function saveSession(s: {
  sessionId: string;
  wallet: string;
  token: string;
  chainId: string;
  nonce: string;
  expectedHandle?: string;
  providerConfig: ProviderVersionInfo;
}): Promise<void> {
  needDb();
  await sql()`INSERT INTO zk_sessions (session_id, wallet, token, chain_id, nonce, expected_handle, provider_config, status)
    VALUES (${s.sessionId}, ${s.wallet}, ${s.token}, ${s.chainId}, ${s.nonce}, ${s.expectedHandle ?? ""}, ${sql().json(JSON.parse(JSON.stringify(s.providerConfig)))}, 'pending')`;
}

export async function getSession(sessionId: string): Promise<ZkSession | null> {
  needDb();
  const rows = (await sql()`SELECT * FROM zk_sessions WHERE session_id = ${sessionId}`) as unknown as ZkSession[];
  return rows[0] ?? null;
}

export async function markSession(sessionId: string, status: ZkSession["status"], failReason = ""): Promise<void> {
  needDb();
  await sql()`UPDATE zk_sessions SET status = ${status}, fail_reason = ${failReason} WHERE session_id = ${sessionId}`;
}

export async function saveVerification(v: {
  handle: string;
  wallet: string;
  token: string;
  chainId: string;
  sessionId: string;
  proofJson: unknown;
}): Promise<void> {
  needDb();
  // ponytail: single statement, session unique index rejects replays atomically
  const rows = await sql()`WITH s AS (
      UPDATE zk_sessions SET status = 'verified' WHERE session_id = ${v.sessionId} AND status = 'pending' RETURNING session_id
    )
    INSERT INTO zk_verifications (handle, wallet, token, chain_id, session_id, proof_json)
    SELECT ${v.handle}, ${v.wallet}, ${v.token}, ${v.chainId}, ${v.sessionId}, ${sql().json(JSON.parse(JSON.stringify(v.proofJson)))} FROM s
    RETURNING session_id`;
  if (rows.length !== 1) throw new Error("zk_session_already_consumed");
}

/** Verification record behind a session (for the status endpoint). */
export async function getVerificationBySession(sessionId: string): Promise<ZkVerification | null> {
  needDb();
  const rows = (await sql()`SELECT * FROM zk_verifications WHERE session_id = ${sessionId}`) as unknown as ZkVerification[];
  return rows[0] ?? null;
}

/** Latest live badge for a token (revoked excluded). */
export async function getTokenBadge(chainId: string, address: string): Promise<ZkVerification | null> {
  needDb();
  const rows = (await sql()`SELECT * FROM zk_verifications
    WHERE lower(chain_id) = lower(${chainId}) AND lower(token) = lower(${address})
    ORDER BY verified_at DESC LIMIT 1`) as unknown as ZkVerification[];
  return rows[0] ?? null;
}

export async function getProof(id: string): Promise<ZkVerification | null> {
  needDb();
  const rows = (await sql()`SELECT v.*, s.provider_config FROM zk_verifications v
    JOIN zk_sessions s ON s.session_id = v.session_id WHERE v.id = ${id}`) as unknown as ZkVerification[];
  return rows[0] ?? null;
}

export async function revokeVerification(id: string, reason: string): Promise<"revoked" | "already_revoked" | "not_found"> {
  needDb();
  const rows = await sql()`WITH changed AS (
      UPDATE zk_verifications
      SET revoked_at = now(), revoke_reason = ${reason}
      WHERE id = ${id}::uuid AND revoked_at IS NULL
      RETURNING id
    ), audit AS (
      INSERT INTO zk_revocation_audit (verification_id, reason, actor)
      SELECT id, ${reason}, 'admin-token' FROM changed
      RETURNING verification_id
    )
    SELECT verification_id AS id, 'revoked' AS outcome FROM audit
    UNION ALL
    SELECT id, 'already_revoked' AS outcome FROM zk_verifications
    WHERE id = ${id}::uuid AND revoked_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM changed)
    LIMIT 1`;
  if (rows.length === 0) return "not_found";
  return (rows[0] as { outcome: "revoked" | "already_revoked" }).outcome;
}

/** Other live tokens sharing a handle (spam-pattern transparency). */
export async function countHandleTokens(handle: string, excludeSession: string): Promise<number> {
  needDb();
  const rows = (await sql()`SELECT count(*)::int AS n FROM zk_verifications
    WHERE handle = ${handle} AND token <> '' AND session_id <> ${excludeSession} AND revoked_at IS NULL`) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}

export type ZkMetrics = {
  sessions: Record<string, number>;
  failures: Record<string, number>;
  verifications24h: number;
};

/** Counts only (brief A7). No wallets, handles, or personal data leave this query. */
export async function getZkMetrics(): Promise<ZkMetrics> {
  needDb();
  const byStatus = (await sql()`SELECT status, count(*)::int AS n FROM zk_sessions GROUP BY status`) as unknown as {
    status: string;
    n: number;
  }[];
  const byReason = (await sql()`SELECT fail_reason, count(*)::int AS n FROM zk_sessions
    WHERE status = 'failed' AND fail_reason <> '' GROUP BY fail_reason`) as unknown as {
    fail_reason: string;
    n: number;
  }[];
  const recent = (await sql()`SELECT count(*)::int AS n FROM zk_verifications
    WHERE verified_at > now() - interval '24 hours'`) as unknown as { n: number }[];
  const sessions: Record<string, number> = {};
  for (const r of byStatus) sessions[r.status] = r.n;
  const failures: Record<string, number> = {};
  for (const r of byReason) failures[r.fail_reason] = r.n;
  return { sessions, failures, verifications24h: recent[0]?.n ?? 0 };
}
