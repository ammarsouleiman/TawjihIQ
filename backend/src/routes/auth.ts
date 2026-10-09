import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { releaseExpiredReservations, syncSchoolInvitations } from "../lib/invitations";

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
  must_change_password?: number | null;
  temp_password_expires_at?: string | null;
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

// Response shape only — mustChangePassword is read fresh from the DB, never from the JWT.
function sessionUser(row: UserRow) {
  return { ...toPublic(row), mustChangePassword: row.must_change_password === 1 };
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  // bcrypt ignores anything past 72 bytes.
  if (Buffer.byteLength(password, "utf8") > 72) return "Password is too long.";
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) {
    return "Password must contain at least one letter and one number.";
  }
  return null;
}

// In-memory fixed-window limiter, keyed per IP.
const rateHits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateHits.get(key);
  if (!entry || entry.resetAt <= now) {
    if (rateHits.size > 10_000) rateHits.clear();
    rateHits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
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
  const invitationCode = String(req.body?.invitationCode ?? "").trim().toUpperCase();

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
  if (!schoolCode && invitationCode) {
    return res.status(400).json({ error: "Enter the school code that belongs to this invitation." });
  }
  if (schoolCode && !invitationCode) {
    return res.status(400).json({ error: "A personal invitation code is required for school access." });
  }

  let reservationToken: string | undefined;
  if (schoolCode) {
    const school = db.prepare("SELECT id FROM schools WHERE code = ?").get(schoolCode) as { id: string } | undefined;
    if (!school) return res.status(400).json({ error: "Invalid school code." });
    releaseExpiredReservations(school.id);
    const invitation = db.prepare(`
      SELECT id, status, reserved_email AS reservedEmail
      FROM school_invitations WHERE school_id = ? AND code = ?
    `).get(school.id, invitationCode) as { id: string; status: string; reservedEmail: string | null } | undefined;
    if (!invitation) return res.status(400).json({ error: "Invalid personal invitation code." });
    if (invitation.status === "activated" || invitation.status === "revoked") {
      return res.status(409).json({ error: "This personal invitation is no longer available." });
    }
    if (invitation.status === "reserved" && invitation.reservedEmail !== email) {
      return res.status(409).json({ error: "This personal invitation is currently reserved by another student." });
    }
    reservationToken = randomUUID();
    const reserved = db.prepare(`
      UPDATE school_invitations
      SET status = 'reserved', reserved_token = ?, reserved_email = ?,
          reserved_until = datetime('now', '+60 minutes')
      WHERE id = ? AND (status = 'available' OR (status = 'reserved' AND reserved_email = ?))
    `).run(reservationToken, email, invitation.id, email);
    if (reserved.changes === 0) {
      return res.status(409).json({ error: "This personal invitation was just reserved by another student." });
    }
  }
  return res.json({ ok: true, reservationToken });
});

// POST /api/auth/signup  { name, email, password, schoolCode?, profile }
// The account and completed profile are inserted together at the end of setup.
authRouter.post("/signup", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const schoolCode = String(req.body?.schoolCode ?? "").trim().toUpperCase();
  const invitationCode = String(req.body?.invitationCode ?? "").trim().toUpperCase();
  const reservationToken = String(req.body?.reservationToken ?? "").trim();
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
  let invitationId: string | null = null;
  if (schoolCode) {
    const school = db
      .prepare("SELECT id, name FROM schools WHERE code = ?")
      .get(schoolCode) as { id: string; name: string } | undefined;
    if (!school) {
      return res.status(400).json({ error: "Invalid school code." });
    }
    schoolId = school.id;
    schoolName = school.name;
    if (!invitationCode || !reservationToken) {
      return res.status(400).json({ error: "Your personal invitation reservation is missing. Start registration again." });
    }
    releaseExpiredReservations(school.id);
    const invitation = db.prepare(`
      SELECT id FROM school_invitations
      WHERE school_id = ? AND code = ? AND status = 'reserved'
        AND reserved_token = ? AND reserved_email = ? AND reserved_until > datetime('now')
    `).get(school.id, invitationCode, reservationToken, email) as { id: string } | undefined;
    if (!invitation) {
      return res.status(409).json({ error: "Your personal invitation expired or is no longer available. Start registration again." });
    }
    invitationId = invitation.id;
  } else if (invitationCode || reservationToken) {
    return res.status(400).json({ error: "A school code is required with a personal invitation." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const createAccount = db.transaction(() => {
      if (invitationId) {
        const stillReserved = db.prepare(`
          SELECT id FROM school_invitations
          WHERE id = ? AND status = 'reserved' AND reserved_token = ?
            AND reserved_email = ? AND reserved_until > datetime('now')
        `).get(invitationId, reservationToken, email);
        if (!stillReserved) throw new Error("INVITATION_EXPIRED");
      }
      db.prepare(
        "INSERT INTO users (id, name, email, password_hash, profile, role, school_id) VALUES (?, ?, ?, ?, ?, 'student', ?)"
      ).run(id, name, email, passwordHash, JSON.stringify(profile), schoolId);
      if (invitationId) {
        db.prepare(`
          UPDATE school_invitations
          SET status = 'activated', used_by_user_id = ?, used_at = datetime('now'),
              reserved_token = NULL, reserved_email = NULL, reserved_until = NULL
          WHERE id = ?
        `).run(id, invitationId);
      }
    });
    createAccount();

    const user: PublicUser = { id, name, email, role: "student", schoolId, schoolName };
    setSessionCookie(res, signToken(user));
    return res.status(201).json({ user });
  } catch (err) {
    console.error("Signup error:", err);
    if (err instanceof Error && err.message === "INVITATION_EXPIRED") {
      return res.status(409).json({ error: "Your personal invitation expired. Start registration again." });
    }
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
    if (row.must_change_password === 1) {
      const { expired } = db
        .prepare("SELECT COALESCE(temp_password_expires_at <= datetime('now'), 1) AS expired FROM users WHERE id = ?")
        .get(row.id) as { expired: number };
      if (expired) {
        return res.status(403).json({
          error: "Your temporary password has expired. Use “Forgot password?” to ask your school for a new one.",
        });
      }
    }
    const user = toPublic(row);
    setSessionCookie(res, signToken(user));
    return res.json({ user: sessionUser(row) });
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

// POST /api/auth/forgot-password  { email }
// Files a reset request in the student's school admin inbox. The reply is
// identical whether or not the account exists, to prevent account discovery.
authRouter.post("/forgot-password", (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (rateLimited(`forgot:${req.ip}`, 5, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const user = db
    .prepare("SELECT id, school_id AS schoolId FROM users WHERE email = ? AND role = 'student'")
    .get(email) as { id: string; schoolId: string | null } | undefined;
  if (user?.schoolId) {
    const pending = db
      .prepare("SELECT id FROM password_reset_requests WHERE user_id = ? AND status = 'pending'")
      .get(user.id);
    const today = (db
      .prepare("SELECT COUNT(*) AS c FROM password_reset_requests WHERE user_id = ? AND created_at > datetime('now', '-1 day')")
      .get(user.id) as { c: number }).c;
    if (!pending && today < 3) {
      db.prepare("INSERT INTO password_reset_requests (id, user_id, school_id) VALUES (?, ?, ?)")
        .run(randomUUID(), user.id, user.schoolId);
    }
  }
  return res.json({ ok: true, supportEmail: DEFAULT_SUPPORT_EMAIL });
});

// POST /api/auth/complete-password-change  { newPassword }
// Replaces a temporary password issued by the school admin.
authRouter.post("/complete-password-change", async (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  const row = db
    .prepare("SELECT u.*, s.name AS school_name FROM users u LEFT JOIN schools s ON s.id = u.school_id WHERE u.id = ?")
    .get(userId) as UserRow | undefined;
  if (!row) return res.status(401).json({ error: "Invalid or expired session." });
  if (row.must_change_password !== 1) {
    return res.status(400).json({ error: "No password change is required." });
  }

  const newPassword = String(req.body?.newPassword ?? "");
  const policyError = passwordPolicyError(newPassword);
  if (policyError) return res.status(400).json({ error: policyError });
  try {
    if (await bcrypt.compare(newPassword, row.password_hash)) {
      return res.status(400).json({ error: "Choose a password different from the temporary one." });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare(
      "UPDATE users SET password_hash = ?, must_change_password = 0, temp_password_expires_at = NULL WHERE id = ?"
    ).run(hash, userId);
    db.prepare("UPDATE password_reset_requests SET temp_password_enc = NULL WHERE user_id = ?").run(userId);
    return res.json({ user: { ...toPublic(row), mustChangePassword: false } });
  } catch (err) {
    console.error("Complete password change error:", err);
    return res.status(500).json({ error: "Could not update your password." });
  }
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
  return res.json({ user: sessionUser(row) });
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

// GET /api/auth/school-access — identifiers belonging to the signed-in
// school student. The personal code is only returned to its activated owner;
// the frontend masks it visually while keeping copy available.
authRouter.get("/school-access", (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });

  const row = db.prepare(`
    SELECT s.code AS schoolCode, i.code AS personalCode
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
      LEFT JOIN school_invitations i
        ON i.used_by_user_id = u.id AND i.status = 'activated'
     WHERE u.id = ? AND u.role = 'student'
  `).get(userId) as { schoolCode: string | null; personalCode: string | null } | undefined;

  if (!row) return res.status(404).json({ error: "Student account not found." });
  return res.json({ schoolCode: row.schoolCode, personalCode: row.personalCode });
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
  const student = db.prepare("SELECT school_id AS schoolId, role FROM users WHERE id = ?").get(userId) as { schoolId: string | null; role: string } | undefined;
  if (student?.schoolId && student.role === "student") {
    db.prepare("UPDATE school_invitations SET status = 'revoked', revoked_at = datetime('now') WHERE used_by_user_id = ?").run(userId);
  }
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  if (student?.schoolId && student.role === "student") {
    const school = db.prepare("SELECT seats FROM schools WHERE id = ?").get(student.schoolId) as { seats: number } | undefined;
    if (school) syncSchoolInvitations(student.schoolId, school.seats);
  }
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
      "UPDATE users SET name = ?, email = ?, password_hash = ?, must_change_password = ?, temp_password_expires_at = ? WHERE id = ?"
    ).run(
      nextName,
      nextEmail,
      nextPasswordHash,
      newPassword ? 0 : row.must_change_password ?? 0,
      newPassword ? null : row.temp_password_expires_at ?? null,
      userId
    );
    if (newPassword) {
      db.prepare("UPDATE password_reset_requests SET temp_password_enc = NULL WHERE user_id = ?").run(userId);
    }

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
