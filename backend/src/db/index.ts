import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import {
  marketFieldsSeed,
  scholarshipsSeed,
} from "./seed-data";

function resolveDbPath(): string {
  const explicitPath = process.env.DATABASE_PATH?.trim();
  if (explicitPath) return explicitPath;

  const dataDir = process.env.DB_DIR?.trim();
  if (dataDir) return path.join(dataDir, "data.db");

  if (process.env.NODE_ENV === "production") {
    // On Railway, mount a persistent volume at /app/data and keep SQLite there.
    return "/app/data/data.db";
  }

  // Local development default.
  return path.join(__dirname, "..", "..", "data.db");
}

const dbPath = resolveDbPath();
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// ---- Schema ----------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS market_fields (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    name    TEXT NOT NULL UNIQUE,
    demand  INTEGER NOT NULL,
    trend   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scholarships (
    id        TEXT PRIMARY KEY,
    title     TEXT NOT NULL,
    org       TEXT NOT NULL,
    type      TEXT NOT NULL,
    deadline  TEXT NOT NULL,
    country   TEXT NOT NULL,
    tag       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    profile        TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schools (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    code        TEXT UNIQUE,
    plan        TEXT NOT NULL DEFAULT 'trial',
    seats       INTEGER NOT NULL DEFAULT 50,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---- Migrations: add columns to existing installs without dropping data -----
function ensureColumn(table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("users", "role", "TEXT NOT NULL DEFAULT 'student'");
ensureColumn("users", "school_id", "TEXT");
ensureColumn("schools", "code", "TEXT");

// ---- Seed (only when tables are empty) -------------------------------------
function seedIfEmpty() {
  const marketCount = (db.prepare("SELECT COUNT(*) AS c FROM market_fields").get() as { c: number }).c;
  if (marketCount === 0) {
    const insert = db.prepare("INSERT INTO market_fields (name, demand, trend) VALUES (@name, @demand, @trend)");
    const insertMany = db.transaction((rows: typeof marketFieldsSeed) => {
      for (const f of rows) insert.run(f);
    });
    insertMany(marketFieldsSeed);
  }

  const scholarshipCount = (db.prepare("SELECT COUNT(*) AS c FROM scholarships").get() as { c: number }).c;
  if (scholarshipCount === 0) {
    const insert = db.prepare(`
      INSERT INTO scholarships (id, title, org, type, deadline, country, tag)
      VALUES (@id, @title, @org, @type, @deadline, @country, @tag)
    `);
    const insertMany = db.transaction((rows: typeof scholarshipsSeed) => {
      for (const s of rows) insert.run(s);
    });
    insertMany(scholarshipsSeed);
  }
}

seedIfEmpty();

// The single bootstrap account: the TawjihIQ company owner. Credentials come
// from Railway env vars (OWNER_EMAIL / OWNER_PASSWORD) — never hard-coded — with
// a local-dev fallback. From this account, all schools and school admins are
// created through the owner control panel; nothing else is seeded statically.
function seedOwner() {
  const email = (process.env.OWNER_EMAIL?.trim() || "owner@tawjihiq.com").toLowerCase();
  const password = process.env.OWNER_PASSWORD?.trim() || "owner123";
  const name = process.env.OWNER_NAME?.trim() || "TawjihIQ";

  const existing = db.prepare("SELECT id, role FROM users WHERE email = ?").get(email) as
    | { id: string; role: string | null }
    | undefined;
  if (existing) {
    // Keep the bootstrap account promoted to owner even if it predates roles.
    if (existing.role !== "owner") {
      db.prepare("UPDATE users SET role = 'owner' WHERE id = ?").run(existing.id);
    }
    return;
  }
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, 'owner')"
  ).run(randomUUID(), name, email, bcrypt.hashSync(password, 10));
}
seedOwner();
