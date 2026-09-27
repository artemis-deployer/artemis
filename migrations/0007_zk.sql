CREATE TABLE IF NOT EXISTS zk_nonces (
  nonce TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zk_sessions (
  session_id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT '',
  chain_id TEXT NOT NULL DEFAULT '',
  nonce TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending','verified','failed','expired')),
  fail_reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zk_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL,
  wallet TEXT NOT NULL,
  token TEXT NOT NULL DEFAULT '',
  chain_id TEXT NOT NULL DEFAULT '',
  session_id TEXT NOT NULL UNIQUE REFERENCES zk_sessions(session_id),
  proof_json JSONB NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS zk_verifications_token_idx ON zk_verifications (chain_id, token);
CREATE INDEX IF NOT EXISTS zk_verifications_handle_idx ON zk_verifications (handle);
