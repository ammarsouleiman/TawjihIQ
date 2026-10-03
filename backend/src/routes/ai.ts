import { Router } from "express";
import { chat, chatJSON, ChatMessage } from "../lib/openai";
import {
    assessmentQuestionsMessages,
    assessmentReportMessages,
    chatSuggestionsMessages,
    chatSystemMessage,
    compareMessages,
    dailyInsightMessages,
    Lang,
    marketMessages,
    recommendationsMessages,
    scholarshipsMessages,
    translateMessages,
    UserProfile,
} from "../lib/prompts";

export const aiRouter = Router();

function getLang(value: unknown): Lang {
  return value === "ar" ? "ar" : "en";
}

// POST /api/ai/recommendations
// body: { profile: {...}, lang?: "en" | "ar" }
aiRouter.post("/recommendations", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  try {
    const result = await chatJSON(recommendationsMessages(profile, lang), 0.6);
    res.json(result);
  } catch (err) {
    console.error("AI recommendations error:", err);
    res.status(502).json({ error: "Failed to generate recommendations." });
  }
});

// POST /api/ai/daily-insight
// One insight is generated per date by the client and then cached in the
// student's persisted profile, avoiding a new AI call on every dashboard load.
aiRouter.post("/daily-insight", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const recommendations = req.body?.recommendations ?? null;
  const lang = getLang(req.body?.lang);
  const requestedDate = typeof req.body?.date === "string" ? req.body.date : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : new Date().toISOString().slice(0, 10);

  try {
    const result = await chatJSON<{ title: string; insight: string; action: string }>(
      dailyInsightMessages(profile, recommendations, date, lang),
      0.7
    );
    res.json(result);
  } catch (err) {
    console.error("AI daily insight error:", err);
    res.status(502).json({ error: "Failed to generate today's insight." });
  }
});

// POST /api/ai/market
// body: { profile: {...}, lang?: "en" | "ar" }
aiRouter.post("/market", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  try {
    const result = await chatJSON(marketMessages(profile, lang), 0.6);
    res.json(result);
  } catch (err) {
    console.error("AI market error:", err);
    res.status(502).json({ error: "Failed to generate market insights." });
  }
});

const SCHOLARSHIP_TYPES = ["Scholarship", "Fellowship", "Grant", "Internship", "Program"] as const;
const FUNDING_TYPES = ["Fully Funded", "Partial", "Stipend", "Certificate", "Paid Internship"] as const;
const BLOCKED_SCHOLARSHIP_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "x.com", "twitter.com",
  "scholarshippositions.com", "opportunitiesforafricans.com", "scholarshiproar.com",
];

type GeneratedScholarship = {
  id: string;
  title: string;
  org: string;
  type: typeof SCHOLARSHIP_TYPES[number];
  deadline: string;
  deadlineISO: string;
  country: string;
  tag: typeof FUNDING_TYPES[number];
  amount?: string;
  applyUrl: string;
  match: number;
  description?: string;
  verifiedAt: string;
};

function canonicalEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) ?? null;
}

// Checks the exact official opportunity/application page—not merely its domain.
// Third-party aggregators and social links are rejected even when reachable.
async function isOfficialScholarshipPage(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (BLOCKED_SCHOLARSHIP_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      let res = await fetch(parsed.toString(), {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; TawjihIQ/1.0)" },
      });
      if (res.status === 403 || res.status === 405) {
        res = await fetch(parsed.toString(), {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 (compatible; TawjihIQ/1.0)", Range: "bytes=0-2047" },
        });
      }
      if (res.status < 200 || res.status >= 400) return false;
      const finalUrl = new URL(res.url);
      const finalHost = finalUrl.hostname.toLowerCase().replace(/^www\./, "");
      return finalUrl.protocol === "https:" && !BLOCKED_SCHOLARSHIP_HOSTS.some(
        (blocked) => finalHost === blocked || finalHost.endsWith(`.${blocked}`)
      );
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// POST /api/ai/scholarships
// body: { profile: {...}, lang?: "en" | "ar" }
aiRouter.post("/scholarships", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  // Random seed forces the AI to generate a fresh, different set each call.
  const seed = Math.random().toString(36).slice(2, 10);
  try {
    const result = await chatJSON<{ scholarships?: unknown[] }>(scholarshipsMessages(profile, lang, seed), 0.4);
    const raw: unknown[] = Array.isArray(result?.scholarships) ? result.scholarships : [];

    const today = new Date().toISOString().slice(0, 10);
    // Normalize machine fields, reject malformed/past entries, then validate
    // the exact official URL in parallel. Unverifiable opportunities are never
    // shown to students.
    const checks = await Promise.allSettled(
      raw.map(async (s) => {
        if (!s || typeof s !== "object" || Array.isArray(s)) return null;
        const sc = s as Record<string, unknown>;
        const type = canonicalEnum(sc.type, SCHOLARSHIP_TYPES);
        const tag = canonicalEnum(sc.tag, FUNDING_TYPES);
        const deadlineISO = typeof sc.deadlineISO === "string" ? sc.deadlineISO.trim() : "";
        const applyUrl = typeof sc.applyUrl === "string" ? sc.applyUrl.trim() : "";
        const required = [sc.id, sc.title, sc.org, sc.deadline, sc.country];
        if (!type || !tag || required.some((value) => typeof value !== "string" || !value.trim())) return null;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(deadlineISO) || deadlineISO < today) return null;
        if (!(await isOfficialScholarshipPage(applyUrl))) return null;

        return {
          id: String(sc.id).trim(),
          title: String(sc.title).trim(),
          org: String(sc.org).trim(),
          type,
          deadline: String(sc.deadline).trim(),
          deadlineISO,
          country: String(sc.country).trim(),
          tag,
          amount: typeof sc.amount === "string" ? sc.amount.trim() : undefined,
          applyUrl,
          match: Math.max(0, Math.min(100, Math.round(Number(sc.match) || 0))),
          description: typeof sc.description === "string" ? sc.description.trim() : undefined,
          verifiedAt: today,
        } satisfies GeneratedScholarship;
      })
    );
    const scholarships: GeneratedScholarship[] = checks.flatMap((result) =>
      result.status === "fulfilled" && result.value !== null ? [result.value] : []
    );

    res.json({ scholarships });
  } catch (err) {
    console.error("AI scholarships error:", err);
    res.status(502).json({ error: "Failed to generate scholarships." });
  }
});

// POST /api/ai/compare
// body: { profile: {...}, majors: string[], lang?: "en" | "ar" }
aiRouter.post("/compare", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  const majors = Array.isArray(req.body?.majors)
    ? (req.body.majors as unknown[]).filter((m): m is string => typeof m === "string").slice(0, 10)
    : [];
  const focus = typeof req.body?.focus === "string" ? req.body.focus : undefined;
  if (majors.length < 2) {
    return res.status(400).json({ error: "Provide at least two majors to compare." });
  }
  try {
    const result = await chatJSON(compareMessages(profile, majors, lang, focus), 0.5);
    res.json(result);
  } catch (err) {
    console.error("AI compare error:", err);
    res.status(502).json({ error: "Failed to generate comparison." });
  }
});

// POST /api/ai/assessment/questions
// body: { profile: {...}, lang?: "en" | "ar", context?: {...} }
aiRouter.post("/assessment/questions", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  const context = req.body?.context;
  try {
    const result = await chatJSON(assessmentQuestionsMessages(profile, lang, context), 0.95);
    res.json(result);
  } catch (err) {
    console.error("AI assessment questions error:", err);
    res.status(502).json({ error: "Failed to generate the assessment." });
  }
});

// POST /api/ai/assessment/report
// body: { profile: {...}, answers: {question, answer, dimension?}[], lang?: "en" | "ar", context?: {...} }
aiRouter.post("/assessment/report", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  const context = req.body?.context;
  const answers = Array.isArray(req.body?.answers)
    ? (req.body.answers as { question: string; answer: string; dimension?: string }[])
    : [];
  if (answers.length === 0) {
    return res.status(400).json({ error: "Provide assessment answers." });
  }
  try {
    const result = await chatJSON(assessmentReportMessages(profile, answers, lang, context), 0.7);
    res.json(result);
  } catch (err) {
    console.error("AI assessment report error:", err);
    res.status(502).json({ error: "Failed to generate the report." });
  }
});

// POST /api/ai/translate
// body: { data: any, lang?: "en" | "ar", preserve?: string[] }
// Localizes already-generated content WITHOUT regenerating it: only the
// human-readable text is translated; numbers, scores and enums stay identical.
aiRouter.post("/translate", async (req, res) => {
  const data = req.body?.data;
  const lang = getLang(req.body?.lang);
  const preserve = Array.isArray(req.body?.preserve)
    ? (req.body.preserve as unknown[]).filter((k): k is string => typeof k === "string")
    : [];
  if (data === undefined || data === null) {
    return res.status(400).json({ error: "Provide data to translate." });
  }
  try {
    const result = await chatJSON(translateMessages(data, lang, preserve), 0.2);
    res.json(result);
  } catch (err) {
    console.error("AI translate error:", err);
    res.status(502).json({ error: "Failed to translate content." });
  }
});

// POST /api/ai/chat-suggestions
// body: { profile: {...}, lang?: "en" | "ar" }
aiRouter.post("/chat-suggestions", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  try {
    const result = await chatJSON<{ suggestions: string[] }>(chatSuggestionsMessages(profile, lang), 0.7);
    res.json(result);
  } catch (err) {
    console.error("AI chat-suggestions error:", err);
    res.status(502).json({ error: "Failed to generate suggestions." });
  }
});

// POST /api/ai/chat
// body: { messages: {role, content}[], profile?: {...}, lang?: "en" | "ar" }
aiRouter.post("/chat", async (req, res) => {
  const profile = (req.body?.profile ?? {}) as UserProfile;
  const lang = getLang(req.body?.lang);
  const history = Array.isArray(req.body?.messages)
    ? (req.body.messages as ChatMessage[])
    : [];

  const messages: ChatMessage[] = [
    chatSystemMessage(profile, lang),
    ...history
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const reply = await chat(messages, { temperature: 0.8 });
    res.json({ reply });
  } catch (err) {
    console.error("AI chat error:", err);
    res.status(502).json({ error: "Failed to get a reply from the advisor." });
  }
});
