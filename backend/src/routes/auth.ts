import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "tawjih-iq-dev-secret-change-me";
const TOKEN_TTL = "30d";

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  profile: string | null;
  created_at: string;
};

type PublicUser = { id: string; name: string; email: string };

type ProfileData = Record<string, unknown>;

function toPublic(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, email: row.email };
}

function signToken(user: PublicUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function parseProfile(raw: string | null): ProfileData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as ProfileData;
    }
    return {};
  } catch {
    return {};
  }
}

function authUserId(header: string | undefined): string | null {
  const value = header ?? "";
  const token = value.startsWith("Bearer ") ? value.slice(7) : "";
  if (!token) return null;
  try {
    return (jwt.verify(token, JWT_SECRET) as PublicUser).id;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/signup  { name, email, password }
authRouter.post("/signup", async (req, res) => {
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

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
    ).run(id, name, email, passwordHash);

    const user: PublicUser = { id, name, email };
    return res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Could not create your account." });
  }
});

// POST /api/auth/login  { email, password }
authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as UserRow | undefined;

  if (!row) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  try {
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const user = toPublic(row);
    return res.json({ token: signToken(user), user });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Could not log you in." });
  }
});

// GET /api/auth/me  (Authorization: Bearer <token>)
authRouter.get("/me", (req, res) => {
  const userId = authUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  const row = db
    .prepare("SELECT id, name, email FROM users WHERE id = ?")
    .get(userId) as PublicUser | undefined;
  if (!row) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
  return res.json({ user: row });
});

// GET /api/auth/profile  (Authorization: Bearer <token>)
// Returns the authenticated user's profile JSON stored in the database.
authRouter.get("/profile", (req, res) => {
  const userId = authUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const row = db
    .prepare("SELECT profile FROM users WHERE id = ?")
    .get(userId) as Pick<UserRow, "profile"> | undefined;
  if (!row) return res.status(404).json({ error: "Account not found." });

  return res.json({ profile: parseProfile(row.profile) });
});

// PATCH /api/auth/profile  (Authorization: Bearer <token>)
// body: { patch: object } merges into existing profile and persists to DB.
authRouter.patch("/profile", (req, res) => {
  const userId = authUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const patch = req.body?.patch;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return res.status(400).json({ error: "Profile patch must be an object." });
  }

  const row = db
    .prepare("SELECT profile FROM users WHERE id = ?")
    .get(userId) as Pick<UserRow, "profile"> | undefined;
  if (!row) return res.status(404).json({ error: "Account not found." });

  const nextProfile = { ...parseProfile(row.profile), ...(patch as ProfileData) };
  db.prepare("UPDATE users SET profile = ? WHERE id = ?").run(
    JSON.stringify(nextProfile),
    userId
  );

  return res.json({ profile: nextProfile });
});

// DELETE /api/auth/me  (Authorization: Bearer <token>)
// Permanently removes the authenticated user's account.
authRouter.delete("/me", (req, res) => {
  const userId = authUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return res.json({ ok: true });
});

// PATCH /api/auth/me  (Authorization: Bearer <token>)
// body: { name?, email?, currentPassword?, newPassword? }
// Updates the authenticated user's name, email and/or password. Changing the
// password requires the current password. Returns a fresh token because the
// name/email are embedded in it.
authRouter.patch("/me", async (req, res) => {
  const userId = authUserId(req.headers.authorization);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(userId) as UserRow | undefined;
  if (!row) return res.status(404).json({ error: "Account not found." });

  const hasName = req.body?.name !== undefined;
  const hasEmail = req.body?.email !== undefined;
  const newPassword = String(req.body?.newPassword ?? "");
  const currentPassword = String(req.body?.currentPassword ?? "");

  let nextName = row.name;
  let nextEmail = row.email;
  let nextPasswordHash = row.password_hash;

  try {
    if (hasName) {
      const name = String(req.body.name ?? "").trim();
      if (!name) return res.status(400).json({ error: "Name cannot be empty." });
      nextName = name;
    }

    if (hasEmail) {
      const email = String(req.body.email ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      if (email !== row.email) {
        const taken = db
          .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
          .get(email, userId);
        if (taken) {
          return res.status(409).json({ error: "An account with this email already exists." });
        }
      }
      nextEmail = email;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }
      const ok = await bcrypt.compare(currentPassword, row.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }
      nextPasswordHash = await bcrypt.hash(newPassword, 10);
    }

    db.prepare(
      "UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?"
    ).run(nextName, nextEmail, nextPasswordHash, userId);

    const user: PublicUser = { id: userId, name: nextName, email: nextEmail };
    return res.json({ token: signToken(user), user });
  } catch (err) {
    console.error("Update account error:", err);
    return res.status(500).json({ error: "Could not update your account." });
  }
});

