import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Router } from "express";
import { db } from "../db";
import { authUser } from "./auth";

export const ownerRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Verified company owner, or null (caller returns 403).
function requireOwner(header: string | undefined) {
  const user = authUser(header);
  if (!user || user.role !== "owner") return null;
  return user;
}

// A short, human-friendly, unambiguous school code (no 0/O/1/I).
function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
    const taken = db.prepare("SELECT id FROM schools WHERE code = ?").get(code);
    if (!taken) return code;
  }
  return randomUUID().slice(0, 6).toUpperCase();
}

// GET /api/owner/schools  — all schools with student & admin counts.
ownerRouter.get("/schools", (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const rows = db
    .prepare(
      `SELECT s.id, s.name, s.code, s.plan, s.seats, s.created_at,
              (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'student') AS students,
              (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'admin')   AS admins
         FROM schools s
        ORDER BY s.created_at DESC`
    )
    .all() as {
    id: string;
    name: string;
    code: string | null;
    plan: string;
    seats: number;
    created_at: string;
    students: number;
    admins: number;
  }[];

  return res.json({ schools: rows });
});

// POST /api/owner/schools  { name, plan?, seats? }  — create a school + code.
ownerRouter.post("/schools", (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const name = String(req.body?.name ?? "").trim();
  const plan = String(req.body?.plan ?? "trial").trim() || "trial";
  const seatsRaw = Number(req.body?.seats);
  const seats = Number.isFinite(seatsRaw) && seatsRaw > 0 ? Math.floor(seatsRaw) : 50;
  if (!name) return res.status(400).json({ error: "School name is required." });

  const id = randomUUID();
  const code = generateCode();
  db.prepare(
    "INSERT INTO schools (id, name, code, plan, seats) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, code, plan, seats);

  return res.status(201).json({ school: { id, name, code, plan, seats, students: 0, admins: 0 } });
});

// POST /api/owner/schools/:id/admin  { name, email, password }  — create a
// school admin bound to that school.
ownerRouter.post("/schools/:id/admin", async (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const schoolId = req.params.id;
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  const school = db.prepare("SELECT id FROM schools WHERE id = ?").get(schoolId);
  if (!school) return res.status(404).json({ error: "School not found." });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();
  db.prepare(
    "INSERT INTO users (id, name, email, password_hash, role, school_id) VALUES (?, ?, ?, ?, 'admin', ?)"
  ).run(id, name, email, passwordHash, schoolId);

  return res.status(201).json({ admin: { id, name, email } });
});
