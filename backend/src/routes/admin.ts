import { Request, Router } from "express";
import { db } from "../db";
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
        savedMajors: savedMajors.length,
        savedScholarships: savedScholarships.length,
      },
      assessmentReport,
      recommendations,
      market,
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

  const result = db
    .prepare("UPDATE users SET school_id = NULL WHERE id = ? AND school_id = ? AND role = 'student'")
    .run(req.params.id, admin.schoolId);
  if (result.changes === 0) return res.status(404).json({ error: "Student not found in your school." });
  return res.json({ ok: true });
});
