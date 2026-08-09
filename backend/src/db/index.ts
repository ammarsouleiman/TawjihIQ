import Database from "better-sqlite3";
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
`);

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
