import { Router } from "express";
import { db } from "../db";
import { authUserId, parseProfile } from "./auth";

export const notificationsRouter = Router();

type NotifPrefs = {
  push?: boolean;
  reminders?: boolean;
  updates?: boolean;
  tips?: boolean;
};

type Localized = { en: string; ar: string };
type Built = { id: string; pref: keyof NotifPrefs; target: string; title: Localized; body: Localized; time: Localized };

// GET /api/notifications?lang=en|ar  (Authorization: Bearer <token>)
// Notifications are derived from the signed-in user's profile and filtered by
// their saved notificationPrefs. Same profile-JSON model as the rest of the
// app — no separate table.
notificationsRouter.get("/", (req, res) => {
  const userId = authUserId(req.headers.authorization);
  if (!userId) return res.json([]);

  const row = db
    .prepare("SELECT profile FROM users WHERE id = ?")
    .get(userId) as { profile: string | null } | undefined;
  if (!row) return res.json([]);

  const profile = parseProfile(row.profile);
  const lang: "en" | "ar" = req.query.lang === "ar" ? "ar" : "en";
  const prefs = (profile.notificationPrefs ?? {}) as NotifPrefs;
  // Unset prefs default to on (matches the frontend defaults). `push` is the
  // master switch: when off, the user receives nothing.
  const enabled = (k: keyof NotifPrefs) => prefs.push !== false && prefs[k] !== false;

  const hasAssessment = !!profile.assessment;
  const recMap = profile.recommendationsByLang;
  const hasRecs = !!recMap && typeof recMap === "object" && Object.keys(recMap as object).length > 0;
  const reportByLang = profile.assessmentReportByLang;
  const hasReport =
    !!profile.assessmentReport ||
    (!!reportByLang && typeof reportByLang === "object" && Object.keys(reportByLang as object).length > 0);
  const marketMap = profile.marketByLang;
  const hasMarket = !!marketMap && typeof marketMap === "object" && Object.keys(marketMap as object).length > 0;
  const savedMajors = Array.isArray(profile.savedMajors) ? profile.savedMajors : [];
  const savedScholarships = Array.isArray(profile.savedScholarships) ? profile.savedScholarships : [];
  // Mirrors the frontend's required personal fields for a "complete" profile.
  const REQUIRED_FIELDS = ["fullName", "age", "country", "city", "school", "educationLevel", "preferredLanguage"];
  const profileComplete = REQUIRED_FIELDS.every((k) => {
    const v = (profile as Record<string, unknown>)[k];
    return typeof v === "string" && v.trim() !== "";
  });
  // Ids the user has already opened — never resurfaced (same profile-JSON model).
  const seen = Array.isArray(profile.seenNotifications) ? (profile.seenNotifications as string[]) : [];

  const built: Built[] = [];

  if (!profileComplete) {
    built.push({
      id: "complete-profile",
      pref: "reminders",
      target: "setup",
      title: { en: "Complete your profile", ar: "أكمل ملفك الشخصي" },
      body: {
        en: "Add your details so we can tailor recommendations to you.",
        ar: "أضف بياناتك حتى نخصّص التوصيات بما يناسبك.",
      },
      time: { en: "Reminder", ar: "تذكير" },
    });
  }

  if (!hasAssessment) {
    built.push({
      id: "take-assessment",
      pref: "reminders",
      target: "assessment",
      title: { en: "Discover your best-fit major", ar: "اكتشف تخصصك الأنسب" },
      body: {
        en: "Take the quick assessment to unlock personalized recommendations.",
        ar: "أجرِ التقييم السريع للحصول على توصيات مخصّصة.",
      },
      time: { en: "Reminder", ar: "تذكير" },
    });
  }

  if (hasReport) {
    built.push({
      id: "assessment-report",
      pref: "updates",
      target: "assessmentReport",
      title: { en: "Your personality report is ready", ar: "تقرير شخصيتك جاهز" },
      body: {
        en: "See the strengths and traits we identified from your assessment.",
        ar: "اطّلع على نقاط القوة والسمات التي حدّدناها من تقييمك.",
      },
      time: { en: "New", ar: "جديد" },
    });
  }

  if (hasRecs) {
    built.push({
      id: "recs-ready",
      pref: "updates",
      target: "results",
      title: { en: "Your matches are ready", ar: "توصياتك جاهزة" },
      body: {
        en: "We've matched you with majors that fit your profile. Open Majors to explore them.",
        ar: "طابقناك مع تخصصات تناسب ملفك. افتح التخصصات لاستكشافها.",
      },
      time: { en: "New", ar: "جديد" },
    });
  }

  if (hasMarket) {
    built.push({
      id: "market-ready",
      pref: "updates",
      target: "market",
      title: { en: "Explore your job market", ar: "استكشف سوق العمل" },
      body: {
        en: "Demand and salary insights for your fields are ready to view.",
        ar: "رؤى الطلب والرواتب لمجالاتك جاهزة للعرض.",
      },
      time: { en: "New", ar: "جديد" },
    });
  }

  if (savedMajors.length >= 2) {
    built.push({
      id: "compare-shortlist",
      pref: "tips",
      target: "shortlist",
      title: { en: "Compare your shortlist", ar: "قارن قائمتك المختصرة" },
      body: {
        en: `You've saved ${savedMajors.length} majors — compare them side by side to decide.`,
        ar: `حفظت ${savedMajors.length} تخصصات — قارنها جنبًا إلى جنب لتقرّر.`,
      },
      time: { en: "Tip", ar: "نصيحة" },
    });
  }

  if (savedScholarships.length >= 1) {
    built.push({
      id: "saved-scholarships",
      pref: "tips",
      target: "shortlist",
      title: { en: "Track your scholarships", ar: "تابع منحك الدراسية" },
      body: {
        en: `You've saved ${savedScholarships.length} scholarship${savedScholarships.length > 1 ? "s" : ""} — keep an eye on their deadlines.`,
        ar: `حفظت ${savedScholarships.length} منحة — تابع مواعيدها النهائية.`,
      },
      time: { en: "Tip", ar: "نصيحة" },
    });
  }

  const out = built
    .filter((n) => enabled(n.pref) && !seen.includes(n.id))
    .map((n) => ({ id: n.id, target: n.target, title: n.title[lang], body: n.body[lang], time: n.time[lang] }));

  return res.json(out);
});
