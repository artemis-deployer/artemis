ALTER TABLE zk_sessions
  ADD COLUMN IF NOT EXISTS provider_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE zk_sessions
  ALTER COLUMN provider_config DROP DEFAULT;
