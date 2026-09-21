CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start BIGINT NOT NULL,
  hits INT NOT NULL
);
