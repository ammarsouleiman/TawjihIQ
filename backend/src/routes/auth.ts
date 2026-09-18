import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || "tawjih-iq-dev-secret-change-me";
const TOKEN_TTL = "24h";
const DEFAULT_SUPPORT_EMAIL = "info@runner-code.com";
const DEFAULT_SUPPORT_PHONE = "+96179161153";

type UserRow = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  profile: string | null;
  role: string | null;
  school_id: string | null;
  school_name?: string | null;
  created_at: string;
};

export type Role = "student" | "admin" | "owner";
type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  schoolId: string | null;
  schoolName: string | null;
};

type ProfileData = Record<string, unknown>;

function toPublic(row: UserRow): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === "admin" || row.role === "owner" ? row.role : "student",
    schoolId: row.school_id ?? null,
    schoolName: row.school_name ?? null,
  };
}

function signToken(user: PublicUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function parseProfile(raw: string | null): ProfileData {
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

// ---- Session cookie (httpOnly, secure) -------------------------------------
const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_COOKIE = "tjq_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24h — the session timeout.

function cookieBaseOptions() {
  // Cross-site (frontend and backend on different domains) needs SameSite=None
  // + Secure in production; lax over http locally.
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}
export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, { ...cookieBaseOptions(), maxAge: SESSION_MAX_AGE });
}
export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieBaseOptions());
}

// The session token is read from the httpOnly cookie (with a Bearer-header
// fallback for non-browser callers). It is never exposed to client-side JS.
function extractToken(req: Request): string | null {
  const cookieHeader = req.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  const auth = req.headers.authorization ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : null;
}

export function authUserId(req: Request): string | null {
  const token = extractToken(req);
  if (!token) return null;
  try {
    return (jwt.verify(token, JWT_SECRET) as PublicUser).id;
  } catch {
    return null;
  }
}

// Full verified payload (id, role, schoolId) for authorization checks.
export function authUser(req: Request): PublicUser | null {
  const token = extractToken(req);
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as PublicUser;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_PROFILE_FIELDS = [
  "fullName",
  "age",
  "country",
  "city",
  "school",
  "educationLevel",
  "preferredLanguage",
  "currentMajor",
  "schoolSystem",
  "gpa",
  "futureCountry",
  "workStyle",
];
const REQUIRED_PROFILE_LISTS = [
  "favoriteSubjects",
  "weakSubjects",
  "interests",
  "curiousCareers",
  "fields",
];
const REQUIRED_PERSONALITY_KEYS = [
  "Introvert",
  "Practical",
  "Structured",
  "Independent",
  "Fast learner",
];

function profileIsComplete(value: unknown): value is ProfileData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const profile = value as ProfileData;
  const stringsComplete = REQUIRED_PROFILE_FIELDS.every((key) => {
    const field = profile[key];
    return typeof field === "string" && field.trim() !== "";
  });
  const listsComplete = REQUIRED_PROFILE_LISTS.every((key) => {
    const field = profile[key];
    return Array.isArray(field) && field.length > 0;
  });
  const skills = profile.skills;
  const skillsComplete =
    !!skills && typeof skills === "object" && !Array.isArray(skills) && Object.keys(skills).length > 0;
  const personality = profile.personality;
  const personalityComplete =
    !!personality &&
    typeof personality === "object" &&
    !Array.isArray(personality) &&
    REQUIRED_PERSONALITY_KEYS.every((key) => {
      const value = (personality as Record<string, unknown>)[key];
      return typeof value === "string" && value.trim() !== "";
    });
  const age = Number(profile.age);
  return stringsComplete && listsComplete && skillsComplete && personalityComplete && age >= 10 && age <= 70;
}

// POST /api/auth/signup/validate
// Checks the registration data without creating an account. The frontend uses
// this before onboarding so an account only exists after profile completion.
authRouter.post("/signup/validate", (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const schoolCode = String(req.body?.schoolCode ?? "").trim().toUpperCase();

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (schoolCode) {
    const school = db.prepare("SELECT id FROM schools WHERE code = ?").get(schoolCode);
    if (!school) return res.status(400).json({ error: "Invalid school code." });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  return res.json({ ok: true });
});

// POST /api/auth/signup  { name, email, password, schoolCode?, profile }
// The account and completed profile are inserted together at the end of setup.
authRouter.post("/signup", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const schoolCode = String(req.body?.schoolCode ?? "").trim().toUpperCase();
  const profile = req.body?.profile;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!profileIsComplete(profile)) {
    return res.status(400).json({ error: "Complete all required profile fields before creating an account." });
  }

  // A school code is optional: when given it must match a real school and links
  // the student to it; when omitted the student is an individual (no school).
  let schoolId: string | null = null;
  let schoolName: string | null = null;
  if (schoolCode) {
    const school = db
      .prepare("SELECT id, name FROM schools WHERE code = ?")
      .get(schoolCode) as { id: string; name: string } | undefined;
    if (!school) {
      return res.status(400).json({ error: "Invalid school code." });
    }
    schoolId = school.id;
    schoolName = school.name;
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    db.prepare(
      "INSERT INTO users (id, name, email, password_hash, profile, role, school_id) VALUES (?, ?, ?, ?, ?, 'student', ?)"
    ).run(id, name, email, passwordHash, JSON.stringify(profile), schoolId);

    const user: PublicUser = { id, name, email, role: "student", schoolId, schoolName };
    setSessionCookie(res, signToken(user));
    return res.status(201).json({ user });
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
    .prepare("SELECT u.*, s.name AS school_name FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.email = ?")
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
    setSessionCookie(res, signToken(user));
    return res.json({ user });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Could not log you in." });
  }
});

// POST /api/auth/logout  — clears the session cookie.
authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

// GET /api/auth/me  — current user from the session cookie.
authRouter.get("/me", (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  const row = db
    .prepare("SELECT u.*, s.name AS school_name FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ?")
    .get(userId) as UserRow | undefined;
  if (!row) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
  return res.json({ user: toPublic(row) });
});

// GET /api/auth/support — returns the correct support channel for the current
// user. School-linked accounts use their school's contacts; independent users
// always use Runner Code support. Empty school contacts safely fall back too.
authRouter.get("/support", (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const row = db
    .prepare(
      `SELECT u.school_id, s.name AS school_name,
              s.support_email, s.support_phone
         FROM users u
    LEFT JOIN schools s ON s.id = u.school_id
        WHERE u.id = ?`
    )
    .get(userId) as {
      school_id: string | null;
      school_name: string | null;
      support_email: string | null;
      support_phone: string | null;
    } | undefined;
  if (!row) return res.status(404).json({ error: "Account not found." });

  return res.json({
    email: row.school_id && row.support_email?.trim() ? row.support_email.trim() : DEFAULT_SUPPORT_EMAIL,
    phone: row.school_id && row.support_phone?.trim() ? row.support_phone.trim() : DEFAULT_SUPPORT_PHONE,
    schoolName: row.school_id ? row.school_name : null,
    schoolProvided: !!(row.school_id && (row.support_email?.trim() || row.support_phone?.trim())),
  });
});

// GET /api/auth/profile  (Authorization: Bearer <token>)
// Returns the authenticated user's profile JSON stored in the database.
authRouter.get("/profile", (req, res) => {
  const userId = authUserId(req);
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
  const userId = authUserId(req);
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
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  clearSessionCookie(res);
  return res.json({ ok: true });
});

// PATCH /api/auth/me  (Authorization: Bearer <token>)
// body: { name?, email?, currentPassword?, newPassword? }
// Updates the authenticated user's name, email and/or password. Changing the
// password requires the current password. Returns a fresh token because the
// name/email are embedded in it.
authRouter.patch("/me", async (req, res) => {
  const userId = authUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Invalid or expired session." });
  }

  const row = db
    .prepare("SELECT u.*, s.name AS school_name FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ?")
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

    const user: PublicUser = {
      id: userId,
      name: nextName,
      email: nextEmail,
      role: row.role === "admin" || row.role === "owner" ? row.role : "student",
      schoolId: row.school_id ?? null,
      schoolName: row.school_name ?? null,
    };
    setSessionCookie(res, signToken(user));
    return res.json({ user });
  } catch (err) {
    console.error("Update account error:", err);
    return res.status(500).json({ error: "Could not update your account." });
  }
});
