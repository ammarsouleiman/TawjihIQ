import { Router } from "express";
import { randomUUID } from "crypto";
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

const eventCatalog = {
  assessment_created: {
    pref: "updates", target: "assessment",
    title: { en: "Your assessment is ready", ar: "تقييمك أصبح جاهزًا" },
    body: { en: "Your personalized assessment questions were created. You can start whenever you're ready.", ar: "تم إنشاء أسئلة تقييمك المخصصة، ويمكنك البدء عندما تكون جاهزًا." },
  },
  assessment_completed: {
    pref: "updates", target: "assessmentReport",
    title: { en: "Assessment completed", ar: "اكتمل التقييم" },
    body: { en: "Great work — your answers were saved and your Career Blueprint is being prepared.", ar: "عمل رائع — تم حفظ إجاباتك ويجري إعداد بصمتك المهنية." },
  },
  assessment_report_ready: {
    pref: "updates", target: "assessmentReport",
    title: { en: "Your Career Blueprint is ready", ar: "بصمتك المهنية جاهزة" },
    body: { en: "Your personalized strengths, traits, and career directions are ready to review.", ar: "نقاط قوتك وسماتك واتجاهاتك المهنية المخصصة أصبحت جاهزة للمراجعة." },
  },
  recommendations_ready: {
    pref: "updates", target: "results",
    title: { en: "Your major matches are ready", ar: "تخصصاتك المطابقة جاهزة" },
    body: { en: "TawjihIQ completed your personalized major recommendations.", ar: "أكمل توجيه توصيات التخصصات المخصصة لك." },
  },
  market_ready: {
    pref: "updates", target: "market",
    title: { en: "Job-market analysis ready", ar: "تحليل سوق العمل جاهز" },
    body: { en: "New demand and career-trend insights were generated for your fields.", ar: "تم إنشاء رؤى جديدة حول الطلب واتجاهات المهن في مجالاتك." },
  },
  scholarships_ready: {
    pref: "updates", target: "scholarships",
    title: { en: "Scholarship matches are ready", ar: "المنح المطابقة جاهزة" },
    body: { en: "A new set of funding opportunities was generated for your profile.", ar: "تم إنشاء مجموعة جديدة من فرص التمويل المناسبة لملفك." },
  },
  comparison_ready: {
    pref: "updates", target: "compare",
    title: { en: "Your major comparison is ready", ar: "مقارنة التخصصات جاهزة" },
    body: { en: "The selected majors were compared side by side to help you decide.", ar: "تمت مقارنة التخصصات المختارة جنبًا إلى جنب لمساعدتك في القرار." },
  },
  major_saved: {
    pref: "tips", target: "shortlist",
    title: { en: "Major saved", ar: "تم حفظ التخصص" },
    body: { en: "A major was added to your shortlist.", ar: "تمت إضافة تخصص إلى قائمتك المحفوظة." },
  },
  scholarship_saved: {
    pref: "tips", target: "shortlist",
    title: { en: "Scholarship saved", ar: "تم حفظ المنحة" },
    body: { en: "A scholarship was added to your saved opportunities.", ar: "تمت إضافة منحة إلى الفرص المحفوظة لديك." },
  },
} as const satisfies Record<string, { pref: keyof NotifPrefs; target: string; title: Localized; body: Localized }>;

type NotificationEvent = keyof typeof eventCatalog;

function relativeTime(value: string, lang: "en" | "ar"): string {
  const parsed = new Date(`${value.replace(" ", "T")}Z`).getTime();
  const minutes = Math.max(0, Math.floor((Date.now() - parsed) / 60000));
  if (minutes < 1) return lang === "ar" ? "الآن" : "Just now";
  if (minutes < 60) return lang === "ar" ? `منذ ${minutes} د` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "ar" ? `منذ ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ar" ? `منذ ${days} ي` : `${days}d ago`;
}

// POST /api/notifications/event
// Records trusted application events. Copy and navigation targets come from the
// server catalog, so clients cannot inject arbitrary notification content.
notificationsRouter.post("/event", (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  const event = req.body?.event as NotificationEvent;
  if (!event || !(event in eventCatalog)) {
    return res.status(400).json({ error: "Unknown notification event." });
  }
  const details = req.body?.details && typeof req.body.details === "object"
    ? JSON.stringify(req.body.details)
    : null;
  const id = randomUUID();
  db.prepare("INSERT INTO user_notifications (id, user_id, event_type, details) VALUES (?, ?, ?, ?)")
    .run(id, userId, event, details);
  return res.status(201).json({ id });
});

// POST /api/notifications/read
notificationsRouter.post("/read", (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated." });
  const ids = Array.isArray(req.body?.ids)
    ? (req.body.ids as unknown[]).filter((id): id is string => typeof id === "string").slice(0, 100)
    : [];
  if (!ids.length) return res.json({ ok: true });

  const placeholders = ids.map(() => "?").join(",");
  db.prepare(`UPDATE user_notifications SET read_at = datetime('now') WHERE user_id = ? AND id IN (${placeholders})`)
    .run(userId, ...ids);

  // Legacy/derived reminders use stable string ids and remain profile-backed.
  const row = db.prepare("SELECT profile FROM users WHERE id = ?").get(userId) as { profile: string | null } | undefined;
  if (row) {
    const profile = parseProfile(row.profile);
    const previous = Array.isArray(profile.seenNotifications) ? profile.seenNotifications as string[] : [];
    profile.seenNotifications = Array.from(new Set([...previous, ...ids])).slice(-500);
    db.prepare("UPDATE users SET profile = ? WHERE id = ?").run(JSON.stringify(profile), userId);
  }
  return res.json({ ok: true });
});

// GET /api/notifications?lang=en|ar  (Authorization: Bearer <token>)
// Notifications are derived from the signed-in user's profile and filtered by
// their saved notificationPrefs. Same profile-JSON model as the rest of the
// app — no separate table.
notificationsRouter.get("/", (req, res) => {
  const userId = authUserId(req);
  if (!userId) return res.json([]);

  const row = db
    .prepare("SELECT profile FROM users WHERE id = ?")
    .get(userId) as { profile: string | null } | undefined;
  if (!row) return res.json([]);

  const profile = parseProfile(row.profile);
  const lang: "en" | "ar" = req.query.lang === "ar" ? "ar" : "en";
  const unreadOnly = req.query.unread === "1";
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

  const eventRows = db.prepare(`
    SELECT id, event_type, created_at
    FROM user_notifications
    WHERE user_id = ? ${unreadOnly ? "AND read_at IS NULL" : ""}
    ORDER BY created_at DESC
    LIMIT 100
  `).all(userId) as { id: string; event_type: string; created_at: string }[];

  const eventNotifications = eventRows.flatMap((row) => {
    const definition = eventCatalog[row.event_type as NotificationEvent];
    if (!definition || !enabled(definition.pref)) return [];
    return [{
      id: row.id,
      target: definition.target,
      title: definition.title[lang],
      body: definition.body[lang],
      time: relativeTime(row.created_at, lang),
    }];
  });
  const recordedEventTypes = new Set(
    (db.prepare("SELECT DISTINCT event_type FROM user_notifications WHERE user_id = ?").all(userId) as { event_type: string }[])
      .map((row) => row.event_type)
  );

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

  if (!hasAssessment && !recordedEventTypes.has("assessment_created")) {
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

  if (hasReport && !recordedEventTypes.has("assessment_report_ready")) {
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

  if (hasRecs && !recordedEventTypes.has("recommendations_ready")) {
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

  if (hasMarket && !recordedEventTypes.has("market_ready")) {
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

  if (savedScholarships.length >= 1 && !recordedEventTypes.has("scholarship_saved")) {
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

  const derivedNotifications = built
    .filter((n) => enabled(n.pref) && !seen.includes(n.id))
    .map((n) => ({ id: n.id, target: n.target, title: n.title[lang], body: n.body[lang], time: n.time[lang] }));

  return res.json([...eventNotifications, ...derivedNotifications]);
});
