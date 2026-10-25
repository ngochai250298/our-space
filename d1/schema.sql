-- Our Space — Cloudflare D1 schema (binding DB, database our-space-db).
--
-- Dựng lại từ đầu:
--   npx wrangler d1 execute our-space-db --remote --file=d1/schema.sql
--   npx wrangler d1 execute our-space-db --remote --file=d1/seed.sql
--
-- Ảnh và avatar không nằm ở đây: file ở R2 (bucket our-space-photos), trong
-- bảng gallery/accounts chỉ lưu key của file.

CREATE TABLE IF NOT EXISTS accounts (
  role TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  display_name TEXT NOT NULL,
  password TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'family',
  gender TEXT NOT NULL DEFAULT 'female',
  avatar_url TEXT,
  revoked_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mật khẩu trang /admin — đổi được ngay trong app, không cần deploy lại.
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  admin_password TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Ngày kỷ niệm + ngày gặp nhau, dùng chung cho cả nhà (một dòng duy nhất).
CREATE TABLE IF NOT EXISTS couple_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  anniversary TEXT NOT NULL,
  next_meeting TEXT NOT NULL,
  next_meeting_label TEXT NOT NULL DEFAULT 'Gặp nhau',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bucket_list (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS diary (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Mỗi cặp bạn bè chỉ nối một lần: role_a/role_b luôn được sắp xếp trước khi ghi.
CREATE TABLE IF NOT EXISTS friend_links (
  id TEXT PRIMARY KEY,
  role_a TEXT NOT NULL,
  role_b TEXT NOT NULL,
  anniversary TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (role_a, role_b)
);

CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  album TEXT NOT NULL DEFAULT 'Kỷ niệm',
  storage_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  from_role TEXT NOT NULL,
  to_role TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  unlock_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  hidden_by_from INTEGER NOT NULL DEFAULT 0,
  hidden_by_to INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS locations (
  role TEXT PRIMARY KEY,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS open_when (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💌',
  body TEXT NOT NULL,
  from_role TEXT NOT NULL,
  opened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
