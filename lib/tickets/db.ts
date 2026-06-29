/**
 * SQLite singleton for support tickets. better-sqlite3 is synchronous;
 * we lazy-open it on first call and keep the handle for the lifetime
 * of the Node process. Mounted at /app/.support-data in the Docker
 * runner so the host's docker volume persists across redeploys.
 */

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH =
  process.env.SUPPORT_DB_PATH ??
  (process.env.NODE_ENV === 'production'
    ? '/app/.support-data/support.db'
    : './data/support.db');

let cached: Database.Database | null = null;

export function getDb(): Database.Database {
  if (cached) return cached;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  migrate(db);
  cached = db;
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      code            TEXT NOT NULL UNIQUE,
      category        TEXT NOT NULL,
      title           TEXT NOT NULL,
      description     TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'open',
      wallet_address  TEXT,
      contact_handle  TEXT,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS tickets_wallet_idx
      ON tickets(wallet_address) WHERE wallet_address IS NOT NULL;
    CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status);
    CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets(created_at);

    CREATE TABLE IF NOT EXISTS rate_buckets (
      key             TEXT PRIMARY KEY,
      tokens          REAL NOT NULL,
      refilled_at     INTEGER NOT NULL
    );
  `);
}

/** Test-only — drop the cached connection so a fresh in-memory DB
 * can be opened. Never call from app code. */
export function _resetForTests(): void {
  if (cached) cached.close();
  cached = null;
}
