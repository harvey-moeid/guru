-- 0001_init.sql
-- Migrasi awal D1. Idempoten (pakai IF NOT EXISTS) dan non-destruktif.
-- Single-user: tidak ada tabel "users" terpisah; app_settings menyimpan 1 baris global.

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- baris tunggal (single-user)
  theme TEXT NOT NULL DEFAULT 'dark',
  tts_voice TEXT,
  tts_rate REAL NOT NULL DEFAULT 1.0,
  save_mode INTEGER NOT NULL DEFAULT 0, -- 0/1: mode hemat kuota AI
  ai_daily_token_budget INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, -- UUID
  token_hash TEXT NOT NULL UNIQUE, -- hash dari token sesi, bukan token mentah
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL, -- IP di-hash, jangan simpan mentah
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_auth_attempts_created_at ON auth_attempts (created_at);

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY, -- UUID
  title TEXT NOT NULL,
  author TEXT,
  extension TEXT NOT NULL CHECK (extension IN ('pdf', 'epub')),
  source_sha256 TEXT NOT NULL,
  r2_key_original TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'uploading', 'extracting', 'outline_review', 'ready', 'failed', 'cancelled')),
  failure_reason TEXT,
  size_bytes INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_books_status ON books (status);

CREATE TABLE IF NOT EXISTS book_processing_jobs (
  id TEXT PRIMARY KEY, -- UUID
  book_id TEXT NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- 'ingest' | dst.
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (book_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_jobs_book_id ON book_processing_jobs (book_id);

CREATE TABLE IF NOT EXISTS book_chapters (
  id TEXT PRIMARY KEY, -- UUID
  book_id TEXT NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- urutan bab
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (book_id, position)
);
CREATE INDEX IF NOT EXISTS idx_chapters_book_id ON book_chapters (book_id);

CREATE TABLE IF NOT EXISTS book_units (
  id TEXT PRIMARY KEY, -- UUID
  chapter_id TEXT NOT NULL REFERENCES book_chapters (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (chapter_id, position)
);
CREATE INDEX IF NOT EXISTS idx_units_chapter_id ON book_units (chapter_id);

CREATE TABLE IF NOT EXISTS book_spans (
  id TEXT PRIMARY KEY, -- UUID; dirujuk oleh sitasi tutor (SPEK §6/§7)
  unit_id TEXT NOT NULL REFERENCES book_units (id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- urutan paragraf dalam unit
  page_index INTEGER, -- hanya bila benar-benar didapat dari sumber
  printed_page_label TEXT,
  content_hash TEXT NOT NULL,
  r2_key TEXT NOT NULL, -- teks asli disimpan di R2, bukan di D1
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (unit_id, position)
);
CREATE INDEX IF NOT EXISTS idx_spans_unit_id ON book_spans (unit_id);
