import { Router } from "express";
import { db } from "../db";
import { authUser, parseProfile } from "./auth";

export const adminRouter = Router();

// Personal fields that make a profile "complete" — mirrors the frontend.
const REQUIRED_FIELDS = ["fullName", "age", "country", "city", "school", "educationLevel", "preferredLanguage"];

type StudentRow = { id: string; name: string; email: string; profile: string | null };
type RecMajor = { name?: string; match?: number };

// Verified admin bound to a school, or null (caller returns 401/403).
function requireAdmin(header: string | undefined) {
  const user = authUser(header);
  if (!user || user.role !== "admin" || !user.schoolId) return null;
  return user;
}

function completion(profile: Record<string, unknown>): number {
  const filled = REQUIRED_FIELDS.filter((k) => {
    const v = profile[k];
    return typeof v === "string" && v.trim() !== "";
  }).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
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
    .prepare("SELECT id, name, email, profile FROM users WHERE school_id = ? AND role = 'student'")
    .all(schoolId) as StudentRow[];
}

// GET /api/admin/overview  (Authorization: Bearer <admin token>)
// Cohort-wide stats for the admin's school, derived from student profiles.
adminRouter.get("/overview", (req, res) => {
  const admin = requireAdmin(req.headers.authorization);
  if (!admin) return res.status(403).json({ error: "Admin access required." });

  const rows = students(admin.schoolId!);
  let assessmentsCompleted = 0;
  let recommendationsGenerated = 0;
  let completionSum = 0;
  const majorTally = new Map<string, number>();

  for (const row of rows) {
    const profile = parseProfile(row.profile);
    if (profile.assessment) assessmentsCompleted++;
    const majors = recMajors(profile);
    if (majors.length > 0) {
      recommendationsGenerated++;
      const top = majors[0]?.name;
      if (typeof top === "string" && top.trim()) {
        majorTally.set(top, (majorTally.get(top) ?? 0) + 1);
      }
    }
    completionSum += completion(profile);
  }

  const topMajors = [...majorTally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return res.json({
    totalStudents: rows.length,
    assessmentsCompleted,
    recommendationsGenerated,
    avgCompletion: rows.length ? Math.round(completionSum / rows.length) : 0,
    topMajors,
  });
});

// GET /api/admin/students  (Authorization: Bearer <admin token>)
// Roster of the admin's school with each student's progress.
adminRouter.get("/students", (req, res) => {
  const admin = requireAdmin(req.headers.authorization);
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
