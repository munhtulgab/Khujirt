-- Admin area (same tables as ../migrations/0004_admin.sql). Users are created with backend/admin_user.py.

CREATE TABLE IF NOT EXISTS admin_users (
  username       TEXT PRIMARY KEY,
  password_hash  TEXT NOT NULL,
  created_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now())::BIGINT)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  TEXT PRIMARY KEY,
  username    TEXT NOT NULL,
  created_at  BIGINT NOT NULL,
  expires_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash     TEXT NOT NULL,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_attempts_ip_time ON admin_login_attempts (ip_hash, created_at);
