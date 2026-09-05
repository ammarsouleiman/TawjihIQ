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
type Built = { id: string; pref: keyof NotifPrefs; title: Localized; body: Localized; time: Localized };

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
  const savedMajors = Array.isArray(profile.savedMajors) ? profile.savedMajors : [];

  const built: Built[] = [];

  if (hasRecs) {
    built.push({
      id: "recs-ready",
      pref: "updates",
      title: { en: "Your matches are ready", ar: "توصياتك جاهزة" },
      body: {
        en: "We've matched you with majors that fit your profile. Open Majors to explore them.",
        ar: "طابقناك مع تخصصات تناسب ملفك. افتح التخصصات لاستكشافها.",
      },
      time: { en: "Today", ar: "اليوم" },
    });
  }

  if (!hasAssessment) {
    built.push({
      id: "take-assessment",
      pref: "reminders",
      title: { en: "Discover your best-fit major", ar: "اكتشف تخصصك الأنسب" },
      body: {
        en: "Take the quick assessment to unlock personalized recommendations.",
        ar: "أجرِ التقييم السريع للحصول على توصيات مخصّصة.",
      },
      time: { en: "Reminder", ar: "تذكير" },
    });
  }

  if (savedMajors.length >= 2) {
    built.push({
      id: "compare-shortlist",
      pref: "tips",
      title: { en: "Compare your shortlist", ar: "قارن قائمتك المختصرة" },
      body: {
        en: `You've saved ${savedMajors.length} majors — compare them side by side to decide.`,
        ar: `حفظت ${savedMajors.length} تخصصات — قارنها جنبًا إلى جنب لتقرّر.`,
      },
      time: { en: "Tip", ar: "نصيحة" },
    });
  }

  const out = built
    .filter((n) => enabled(n.pref))
    .map((n) => ({ id: n.id, title: n.title[lang], body: n.body[lang], time: n.time[lang] }));

  return res.json(out);
});
