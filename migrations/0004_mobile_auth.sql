PRAGMA foreign_keys = ON;

-- Short-lived, single-use handoff codes for the native iOS OAuth flow.
-- The verifier never leaves the device until the exchange request.
CREATE TABLE IF NOT EXISTS mobile_auth_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_challenge TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_mobile_auth_codes_expiry
  ON mobile_auth_codes(expires_at);
