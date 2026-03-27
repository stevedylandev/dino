CREATE TABLE IF NOT EXISTS used_tokens (
  nonce   TEXT PRIMARY KEY,
  used_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_used_tokens_used_at ON used_tokens (used_at);
