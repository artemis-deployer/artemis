import postgres from "postgres";
import { isDbConfigured } from "./community-db";

export type ZkSession = {
  session_id: string;
  wallet: string;
  token: string;
  chain_id: string;
  nonce: string;
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
  const rows = await sql()`DELETE FROM zk_nonces WHERE nonce = ${nonce} AND lower(wallet) = lower(${wallet}) RETURNING nonce`;
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
}): Promise<void> {
  needDb();
  await sql()`INSERT INTO zk_sessions (session_id, wallet, token, chain_id, nonce, status)
    VALUES (${s.sessionId}, ${s.wallet}, ${s.token}, ${s.chainId}, ${s.nonce}, 'pending')`;
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
  await sql()`WITH s AS (
      UPDATE zk_sessions SET status = 'verified' WHERE session_id = ${v.sessionId} AND status = 'pending' RETURNING session_id
    )
    INSERT INTO zk_verifications (handle, wallet, token, chain_id, session_id, proof_json)
    SELECT ${v.handle}, ${v.wallet}, ${v.token}, ${v.chainId}, ${v.sessionId}, ${sql().json(JSON.parse(JSON.stringify(v.proofJson)))} FROM s`;
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
    WHERE lower(chain_id) = lower(${chainId}) AND lower(token) = lower(${address}) AND revoked_at IS NULL
    ORDER BY verified_at DESC LIMIT 1`) as unknown as ZkVerification[];
  return rows[0] ?? null;
}

export async function getProof(id: string): Promise<ZkVerification | null> {
  needDb();
  const rows = (await sql()`SELECT * FROM zk_verifications WHERE id = ${id}`) as unknown as ZkVerification[];
  return rows[0] ?? null;
}

/** Other live tokens sharing a handle (spam-pattern transparency). */
export async function countHandleTokens(handle: string, excludeSession: string): Promise<number> {
  needDb();
  const rows = (await sql()`SELECT count(*)::int AS n FROM zk_verifications
    WHERE handle = ${handle} AND session_id <> ${excludeSession} AND revoked_at IS NULL`) as unknown as { n: number }[];
  return rows[0]?.n ?? 0;
}
