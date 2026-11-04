-- Khujirt API schema (Cloudflare D1 / SQLite)

CREATE TABLE IF NOT EXISTS products (
  slug            TEXT PRIMARY KEY,
  name_mn         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_mn  TEXT NOT NULL DEFAULT '',
  description_en  TEXT NOT NULL DEFAULT '',
  category        TEXT NOT NULL CHECK (category IN ('still', 'sparkling', 'iodine', 'flavoured')),
  packaging       TEXT NOT NULL CHECK (packaging IN ('pet', 'glass')),
  volumes         TEXT NOT NULL DEFAULT '[]',          -- JSON array of labels, e.g. ["330 мл","1.5 л"]
  image_url       TEXT NOT NULL,
  shop_url        TEXT NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at      INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE INDEX IF NOT EXISTS idx_products_active_order ON products (active, sort_order);

-- Headline numbers shown on the site (key → integer stored as text).
CREATE TABLE IF NOT EXISTS facts (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

-- Messages from the contact form. IP addresses are never stored, only a salted hash for rate limiting.
CREATE TABLE IF NOT EXISTS contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  message     TEXT NOT NULL,
  locale      TEXT NOT NULL DEFAULT 'mn' CHECK (locale IN ('mn', 'en')),
  ip_hash     TEXT NOT NULL,
  user_agent  TEXT,
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'answered', 'spam')),
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contact_ip_time ON contact_messages (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_contact_status_time ON contact_messages (status, created_at);
