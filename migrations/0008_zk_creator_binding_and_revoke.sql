ALTER TABLE zk_sessions
  ADD COLUMN IF NOT EXISTS expected_handle TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS zk_revocation_audit (
  id BIGSERIAL PRIMARY KEY,
  verification_id UUID NOT NULL REFERENCES zk_verifications(id),
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS zk_revocation_audit_verification_idx
  ON zk_revocation_audit (verification_id, revoked_at DESC);
