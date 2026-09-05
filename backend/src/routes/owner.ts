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

// GET /api/owner/schools/:id/admins  — the school's admin accounts.
ownerRouter.get("/schools/:id/admins", (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const admins = db
    .prepare(
      "SELECT id, name, email, created_at FROM users WHERE school_id = ? AND role = 'admin' ORDER BY created_at ASC"
    )
    .all(req.params.id) as { id: string; name: string; email: string; created_at: string }[];

  return res.json({ admins });
});

// PATCH /api/owner/admins/:id  { name?, email?, password? }  — edit an admin.
ownerRouter.patch("/admins/:id", async (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const adminId = req.params.id;
  const row = db
    .prepare("SELECT id, name, email, password_hash FROM users WHERE id = ? AND role = 'admin'")
    .get(adminId) as { id: string; name: string; email: string; password_hash: string } | undefined;
  if (!row) return res.status(404).json({ error: "Admin not found." });

  let nextName = row.name;
  let nextEmail = row.email;
  let nextHash = row.password_hash;

  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ error: "Name cannot be empty." });
    nextName = name;
  }
  if (req.body?.email !== undefined) {
    const email = String(req.body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Please enter a valid email address." });
    if (email !== row.email) {
      const taken = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, adminId);
      if (taken) return res.status(409).json({ error: "An account with this email already exists." });
    }
    nextEmail = email;
  }
  const password = String(req.body?.password ?? "");
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    nextHash = await bcrypt.hash(password, 10);
  }

  db.prepare("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?").run(
    nextName,
    nextEmail,
    nextHash,
    adminId
  );
  return res.json({ admin: { id: adminId, name: nextName, email: nextEmail } });
});

// DELETE /api/owner/admins/:id  — remove an admin account.
ownerRouter.delete("/admins/:id", (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const result = db.prepare("DELETE FROM users WHERE id = ? AND role = 'admin'").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Admin not found." });
  return res.json({ ok: true });
});

// PATCH /api/owner/schools/:id  { name?, plan?, seats? }  — edit a school.
ownerRouter.patch("/schools/:id", (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const schoolId = req.params.id;
  const row = db
    .prepare("SELECT id, name, code, plan, seats FROM schools WHERE id = ?")
    .get(schoolId) as { id: string; name: string; code: string | null; plan: string; seats: number } | undefined;
  if (!row) return res.status(404).json({ error: "School not found." });

  let nextName = row.name;
  let nextPlan = row.plan;
  let nextSeats = row.seats;
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) return res.status(400).json({ error: "School name is required." });
    nextName = name;
  }
  if (req.body?.plan !== undefined) {
    nextPlan = String(req.body.plan).trim() || row.plan;
  }
  if (req.body?.seats !== undefined) {
    const seats = Number(req.body.seats);
    if (Number.isFinite(seats) && seats > 0) nextSeats = Math.floor(seats);
  }

  db.prepare("UPDATE schools SET name = ?, plan = ?, seats = ? WHERE id = ?").run(
    nextName,
    nextPlan,
    nextSeats,
    schoolId
  );
  return res.json({ school: { id: schoolId, name: nextName, code: row.code, plan: nextPlan, seats: nextSeats } });
});

// DELETE /api/owner/schools/:id  — delete a school; its admins are removed and
// its students are detached (kept, but no longer linked to any school).
ownerRouter.delete("/schools/:id", (req, res) => {
  const owner = requireOwner(req.headers.authorization);
  if (!owner) return res.status(403).json({ error: "Owner access required." });

  const schoolId = req.params.id;
  const school = db.prepare("SELECT id FROM schools WHERE id = ?").get(schoolId);
  if (!school) return res.status(404).json({ error: "School not found." });

  const tx = db.transaction(() => {
    db.prepare("DELETE FROM users WHERE school_id = ? AND role = 'admin'").run(schoolId);
    db.prepare("UPDATE users SET school_id = NULL WHERE school_id = ? AND role = 'student'").run(schoolId);
    db.prepare("DELETE FROM schools WHERE id = ?").run(schoolId);
  });
  tx();
  return res.json({ ok: true });
});
