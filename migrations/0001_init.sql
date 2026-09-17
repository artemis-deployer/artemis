CREATE TABLE IF NOT EXISTS tokens (
  chain_id TEXT NOT NULL,
  address TEXT NOT NULL,
  creator TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  pool TEXT NOT NULL DEFAULT '',
  tx_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chain_id, address)
);
CREATE INDEX IF NOT EXISTS tokens_created_idx ON tokens (created_at DESC);
