-- Admin area: users (PBKDF2 password hashes), sign-in sessions (hashed tokens) and failed sign-in attempts.
-- Users are not seeded here (this repository is public): create one with backend/admin_user.py.

CREATE TABLE IF NOT EXISTS admin_users (
  username       TEXT PRIMARY KEY,
  password_hash  TEXT NOT NULL,
  created_at     INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  TEXT PRIMARY KEY,
  username    TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash     TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_attempts_ip_time ON admin_login_attempts (ip_hash, created_at);
