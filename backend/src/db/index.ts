import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import { randomBytes, randomUUID } from "crypto";
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
db.pragma("foreign_keys = ON");

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

  CREATE TABLE IF NOT EXISTS user_notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    details     TEXT,
    read_at     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
    ON user_notifications(user_id, read_at, created_at DESC);

  CREATE TABLE IF NOT EXISTS school_invitations (
    id              TEXT PRIMARY KEY,
    school_id       TEXT NOT NULL,
    code            TEXT NOT NULL UNIQUE,
    status          TEXT NOT NULL DEFAULT 'available',
    reserved_token  TEXT,
    reserved_email  TEXT,
    reserved_until  TEXT,
    used_by_user_id TEXT UNIQUE,
    used_at         TEXT,
    revoked_at      TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_school_invitations_school_status
    ON school_invitations(school_id, status, created_at);

  CREATE TABLE IF NOT EXISTS password_reset_requests (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    school_id    TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    resolved_by  TEXT,
    resolved_at  TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_password_reset_requests_school
    ON password_reset_requests(school_id, status, created_at DESC);

  -- One support conversation per school, between its admins and the owner.
  CREATE TABLE IF NOT EXISTS support_messages (
    id           TEXT PRIMARY KEY,
    school_id    TEXT NOT NULL,
    sender_id    TEXT,
    sender_role  TEXT NOT NULL,
    body         TEXT NOT NULL,
    read_at      TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_support_messages_school
    ON support_messages(school_id, created_at);
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
ensureColumn("users", "must_change_password", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "temp_password_expires_at", "TEXT");
ensureColumn("password_reset_requests", "temp_password_enc", "TEXT");
ensureColumn("schools", "code", "TEXT");
ensureColumn("schools", "support_email", "TEXT");
ensureColumn("schools", "support_phone", "TEXT");

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

// Backfill invitation seats for schools created before personal invitations
// existed. Existing students receive an activated legacy slot; the remaining
// capacity receives distributable one-time codes.
function invitationCode() {
  const raw = randomBytes(8).toString("hex").toUpperCase();
  return `INV-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function backfillSchoolInvitations() {
  const schools = db.prepare("SELECT id, seats FROM schools").all() as { id: string; seats: number }[];
  const insertUsed = db.prepare(`
    INSERT INTO school_invitations (id, school_id, code, status, used_by_user_id, used_at)
    VALUES (?, ?, ?, 'activated', ?, datetime('now'))
  `);
  const insertAvailable = db.prepare(
    "INSERT INTO school_invitations (id, school_id, code, status) VALUES (?, ?, ?, 'available')"
  );

  const tx = db.transaction(() => {
    for (const school of schools) {
      const unmapped = db.prepare(`
        SELECT u.id FROM users u
        WHERE u.school_id = ? AND u.role = 'student'
          AND NOT EXISTS (SELECT 1 FROM school_invitations i WHERE i.used_by_user_id = u.id)
      `).all(school.id) as { id: string }[];
      for (const student of unmapped) {
        insertUsed.run(randomUUID(), school.id, `LEGACY-${randomUUID()}`, student.id);
      }

      const activeCount = (db.prepare(`
        SELECT COUNT(*) AS count FROM school_invitations
        WHERE school_id = ? AND status != 'revoked'
      `).get(school.id) as { count: number }).count;
      for (let i = activeCount; i < school.seats; i++) {
        insertAvailable.run(randomUUID(), school.id, invitationCode());
      }
    }
  });
  tx();
}

backfillSchoolInvitations();
