import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { Request, Router } from "express";
import { db } from "../db";
import { listSchoolInvitations, replaceInvitation, syncSchoolInvitations } from "../lib/invitations";
import { decryptSecret, encryptSecret } from "../lib/secret-box";
import { authUser, parseProfile } from "./auth";

export const adminRouter = Router();

// Personal fields that make a profile "complete" — mirrors the frontend.
const COMPLETION_FIELDS = [
  "fullName", "age", "country", "educationLevel", "gpa", "favoriteSubjects",
  "interests", "fields", "workStyle", "skills", "personality",
];

type StudentRow = { id: string; name: string; email: string; profile: string | null; created_at: string };
type RecMajor = { name?: string; match?: number };

// Verified admin bound to a school, or null (caller returns 401/403).
function requireAdmin(req: Request) {
  const user = authUser(req);
  if (!user || user.role !== "admin" || !user.schoolId) return null;
  return user;
}

function completion(profile: Record<string, unknown>): number {
  const filled = COMPLETION_FIELDS.filter((key) => {
    const value = profile[key];
    if (value == null) return false;
    if (typeof value === "string") return value.trim() !== "";
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value as object).length > 0;
    return true;
  }).length;
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

// The student's recommended majors in their canonical language (en preferred).
function recMajors(profile: Record<string, unknown>): RecMajor[] {
  const byLang = profile.recommendationsByLang;
  if (!byLang || typeof byLang !== "object") return [];
  const map = byLang as Record<string, { majors?: RecMajor[] }>;
  const canonical = map.en ?? map.ar;
  return Array.isArray(canonical?.majors) ? canonical!.majors : [];
}

function students(schoolId: string): StudentRow[] {
  return db
    .prepare("SELECT id, name, email, profile, created_at FROM users WHERE school_id = ? AND role = 'student' ORDER BY created_at DESC")
    .all(schoolId) as StudentRow[];
}

function canonicalValue<T>(profile: Record<string, unknown>, mapKey: string, legacyKey?: string): T | null {
  const byLang = profile[mapKey];
  if (byLang && typeof byLang === "object" && !Array.isArray(byLang)) {
    const map = byLang as Record<string, T>;
    if (map.en) return map.en;
    if (map.ar) return map.ar;
  }
  return legacyKey && profile[legacyKey] ? profile[legacyKey] as T : null;
}

function arrayValue(profile: Record<string, unknown>, key: string): unknown[] {
  return Array.isArray(profile[key]) ? profile[key] as unknown[] : [];
}

adminRouter.get("/invitations", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });
  return res.json({ invitations: listSchoolInvitations(admin.schoolId!) });
});

adminRouter.post("/invitations/:id/replace", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });
  const invitation = replaceInvitation(admin.schoolId!, req.params.id);
  if (!invitation) return res.status(400).json({ error: "Only unused invitations can be replaced." });
  return res.status(201).json({ invitation });
});

type RecData = { majors?: RecMajor[]; gaps?: string[] };
// The student's canonical recommendations object (en preferred).
function recData(profile: Record<string, unknown>): RecData | null {
  const byLang = profile.recommendationsByLang;
  if (!byLang || typeof byLang !== "object") return null;
  const map = byLang as Record<string, RecData>;
  return map.en ?? map.ar ?? null;
}

// GET /api/admin/overview  (Authorization: Bearer <admin token>)
// Cohort-wide stats for the admin's school, derived from student profiles.
adminRouter.get("/overview", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const rows = students(admin.schoolId!);
  const school = db
    .prepare("SELECT name, code, plan, seats FROM schools WHERE id = ?")
    .get(admin.schoolId) as { name: string; code: string | null; plan: string; seats: number } | undefined;
  let assessmentsCompleted = 0;
  let recommendationsGenerated = 0;
  let completionSum = 0;
  const majorTally = new Map<string, number>();
  const categoryTally = new Map<string, number>();
  const gapTally = new Map<string, number>();

  for (const row of rows) {
    const profile = parseProfile(row.profile);
    if (profile.assessment) assessmentsCompleted++;
    const rec = recData(profile);
    const majors = rec?.majors ?? [];
    if (majors.length > 0) {
      recommendationsGenerated++;
      const top = majors[0];
      if (typeof top?.name === "string" && top.name.trim()) {
        majorTally.set(top.name, (majorTally.get(top.name) ?? 0) + 1);
      }
      const cat = (top as { category?: string })?.category;
      if (typeof cat === "string" && cat.trim()) {
        categoryTally.set(cat, (categoryTally.get(cat) ?? 0) + 1);
      }
    }
    for (const gap of rec?.gaps ?? []) {
      if (typeof gap === "string" && gap.trim()) {
        gapTally.set(gap, (gapTally.get(gap) ?? 0) + 1);
      }
    }
    completionSum += completion(profile);
  }

  const rank = (m: Map<string, number>, n: number) =>
    [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, n);

  return res.json({
    school: school ?? null,
    totalStudents: rows.length,
    assessmentsCompleted,
    recommendationsGenerated,
    avgCompletion: rows.length ? Math.round(completionSum / rows.length) : 0,
    // Engagement funnel across the cohort.
    engagement: {
      notStarted: rows.length - assessmentsCompleted,
      assessed: Math.max(0, assessmentsCompleted - recommendationsGenerated),
      recommended: recommendationsGenerated,
    },
    topMajors: rank(majorTally, 6),
    topCategories: rank(categoryTally, 6),
    topGaps: rank(gapTally, 6),
  });
});

// GET /api/admin/students  (Authorization: Bearer <admin token>)
// Roster of the admin's school with each student's progress.
adminRouter.get("/students", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const list = students(admin.schoolId!).map((row) => {
    const profile = parseProfile(row.profile);
    const majors = recMajors(profile);
    const name =
      typeof profile.fullName === "string" && profile.fullName.trim()
        ? (profile.fullName as string)
        : row.name;
    return {
      id: row.id,
      name,
      email: row.email,
      hasAssessment: !!profile.assessment,
      hasRecommendations: majors.length > 0,
      completion: completion(profile),
      topMajor: typeof majors[0]?.name === "string" ? majors[0]!.name : null,
    };
  });

  return res.json({ students: list });
});

// Complete, read-only guidance record for one student. The school boundary is
// enforced in the query so an admin can never inspect another school's data.
adminRouter.get("/students/:id", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const row = db
    .prepare("SELECT id, name, email, profile, created_at FROM users WHERE id = ? AND school_id = ? AND role = 'student'")
    .get(req.params.id, admin.schoolId) as StudentRow | undefined;
  if (!row) return res.status(404).json({ error: "Student not found in your school." });

  const profile = parseProfile(row.profile);
  const recommendations = canonicalValue<Record<string, unknown>>(profile, "recommendationsByLang");
  const assessmentReport = canonicalValue<Record<string, unknown>>(profile, "assessmentReportByLang", "assessmentReport");
  const market = canonicalValue<Record<string, unknown>>(profile, "marketByLang");
  const scholarships = arrayValue(profile, "scholarshipsAI");
  const savedMajors = arrayValue(profile, "savedMajors");
  const savedScholarships = arrayValue(profile, "savedScholarships");
  const majors = Array.isArray(recommendations?.majors) ? recommendations.majors : [];
  const roadmap = Array.isArray(recommendations?.roadmap) ? recommendations.roadmap : [];
  const text = (key: string) => typeof profile[key] === "string" ? String(profile[key]) : "";

  return res.json({
    student: {
      id: row.id,
      name: text("fullName") || row.name,
      email: row.email,
      createdAt: row.created_at,
      completion: completion(profile),
      personal: {
        age: text("age"), country: text("country"), city: text("city"), school: text("school"),
        educationLevel: text("educationLevel"), schoolSystem: text("schoolSystem"), gpa: text("gpa"),
        currentMajor: text("currentMajor"), preferredLanguage: text("preferredLanguage"),
        futureCountry: text("futureCountry"), workStyle: text("workStyle"),
        favoriteSubjects: arrayValue(profile, "favoriteSubjects"),
        weakSubjects: arrayValue(profile, "weakSubjects"),
        interests: arrayValue(profile, "interests"),
        curiousCareers: arrayValue(profile, "curiousCareers"),
        fields: arrayValue(profile, "fields"),
        skills: profile.skills && typeof profile.skills === "object" ? profile.skills : {},
        personality: profile.personality && typeof profile.personality === "object" ? profile.personality : {},
      },
      status: {
        profileComplete: completion(profile) === 100,
        assessmentComplete: !!profile.assessment || !!assessmentReport,
        dnaReportReady: !!assessmentReport,
        recommendationsReady: majors.length > 0,
        careerReportReady: majors.length > 0,
        roadmapReady: roadmap.length > 0,
        marketViewed: !!market,
        scholarshipsReady: scholarships.length > 0,
        savedMajors: savedMajors.length,
        savedScholarships: savedScholarships.length,
      },
      assessmentReport,
      recommendations,
      market,
      scholarships,
      savedMajors,
      savedScholarships,
    },
  });
});

// Removing a student from a school preserves their TawjihIQ account and all
// personal guidance data; only the school association is cleared.
adminRouter.delete("/students/:id", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const result = db.transaction(() => {
    const changed = db
      .prepare("UPDATE users SET school_id = NULL WHERE id = ? AND school_id = ? AND role = 'student'")
      .run(req.params.id, admin.schoolId);
    if (changed.changes > 0) {
      db.prepare(`
        UPDATE school_invitations SET status = 'revoked', revoked_at = datetime('now')
        WHERE school_id = ? AND used_by_user_id = ?
      `).run(admin.schoolId, req.params.id);
    }
    return changed;
  })();
  if (result.changes === 0) return res.status(404).json({ error: "Student not found in your school." });
  const school = db.prepare("SELECT seats FROM schools WHERE id = ?").get(admin.schoolId) as { seats: number } | undefined;
  if (school) syncSchoolInvitations(admin.schoolId!, school.seats);
  return res.json({ ok: true });
});

// ---- Password reset inbox ---------------------------------------------------
const TEMP_PASSWORD_TTL_HOURS = 24;
// No look-alike characters (0/O, 1/l/I) so it can be read out or written down.
const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function tempPassword(): string {
  for (;;) {
    let raw = "";
    for (let i = 0; i < 12; i++) raw += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
    if (/[A-Za-z]/.test(raw) && /\d/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  }
}

type RequestRow = {
  id: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  enc: string | null;
  studentId: string;
  studentName: string;
  studentEmail: string;
  mustChange: number;
  expiresAt: string | null;
  expired: number | null;
};

// Pending requests, plus handled ones for 24h so the admin can still see the
// code. The code is only returned while it is the student's live temp password.
adminRouter.get("/password-requests", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });
  const rows = db.prepare(`
    SELECT r.id, r.status, r.created_at AS createdAt, r.resolved_at AS resolvedAt, r.temp_password_enc AS enc,
           u.id AS studentId, u.name AS studentName, u.email AS studentEmail,
           u.must_change_password AS mustChange, u.temp_password_expires_at AS expiresAt,
           (u.temp_password_expires_at <= datetime('now')) AS expired
      FROM password_reset_requests r
      JOIN users u ON u.id = r.user_id
     WHERE r.school_id = ? AND u.school_id = r.school_id AND u.role = 'student'
       AND (r.status = 'pending'
            OR (r.status = 'resolved' AND r.resolved_at > datetime('now', '-${TEMP_PASSWORD_TTL_HOURS} hours')))
     ORDER BY (r.status = 'pending') DESC, COALESCE(r.resolved_at, r.created_at) DESC
  `).all(admin.schoolId) as RequestRow[];

  const requests = rows.map((r) => {
    const base = {
      id: r.id,
      createdAt: r.createdAt,
      studentId: r.studentId,
      studentName: r.studentName,
      studentEmail: r.studentEmail,
    };
    if (r.status === "pending") return { ...base, status: "pending" as const };
    const live = r.enc && r.mustChange === 1 && !r.expired ? decryptSecret(r.enc) : null;
    return {
      ...base,
      status: "done" as const,
      resolvedAt: r.resolvedAt,
      tempPassword: live,
      expiresAt: live ? r.expiresAt : null,
      codeState: live ? "active" : r.mustChange === 1 ? "expired" : "changed",
    };
  });
  res.set("Cache-Control", "no-store");
  return res.json({ requests });
});

// Issues a temporary password (stored as a bcrypt hash for login, and
// AES-encrypted on the request so the admin can re-view it until it's used).
// The student must replace it at next login, within 24h.
adminRouter.post("/password-requests/:id/resolve", async (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const request = db.prepare(`
    SELECT r.id, r.user_id AS userId FROM password_reset_requests r
      JOIN users u ON u.id = r.user_id
     WHERE r.id = ? AND r.school_id = ? AND r.status = 'pending' AND u.school_id = r.school_id AND u.role = 'student'
  `).get(req.params.id, admin.schoolId) as { id: string; userId: string } | undefined;
  if (!request) return res.status(404).json({ error: "Request not found or already handled." });

  const password = tempPassword();
  const hash = await bcrypt.hash(password, 12);
  const done = db.transaction(() => {
    const claimed = db.prepare(`
      UPDATE password_reset_requests SET status = 'resolved', resolved_by = ?, resolved_at = datetime('now')
       WHERE id = ? AND status = 'pending'
    `).run(admin.id, request.id);
    if (claimed.changes === 0) return false;
    // Only the newest code is ever viewable.
    db.prepare("UPDATE password_reset_requests SET temp_password_enc = NULL WHERE user_id = ?").run(request.userId);
    db.prepare("UPDATE password_reset_requests SET temp_password_enc = ? WHERE id = ?").run(encryptSecret(password), request.id);
    db.prepare(`
      UPDATE users SET password_hash = ?, must_change_password = 1,
             temp_password_expires_at = datetime('now', '+${TEMP_PASSWORD_TTL_HOURS} hours')
       WHERE id = ? AND school_id = ? AND role = 'student'
    `).run(hash, request.userId, admin.schoolId);
    // Any duplicate pending requests from the same student are covered by this reset.
    db.prepare(`
      UPDATE password_reset_requests SET status = 'dismissed', resolved_by = ?, resolved_at = datetime('now')
       WHERE user_id = ? AND status = 'pending'
    `).run(admin.id, request.userId);
    return true;
  })();
  if (!done) return res.status(409).json({ error: "Request was already handled." });
  res.set("Cache-Control", "no-store");
  return res.json({ tempPassword: password, expiresInHours: TEMP_PASSWORD_TTL_HOURS });
});

adminRouter.post("/password-requests/:id/dismiss", (req, res) => {
  const admin = requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "Admin access required." });
  const result = db.prepare(`
    UPDATE password_reset_requests SET status = 'dismissed', resolved_by = ?, resolved_at = datetime('now')
     WHERE id = ? AND school_id = ? AND status = 'pending'
  `).run(admin.id, req.params.id, admin.schoolId);
  if (result.changes === 0) return res.status(404).json({ error: "Request not found or already handled." });
  return res.json({ ok: true });
});
