import { Router } from "express";
import { chat, chatJSON, ChatMessage } from "../lib/openai";
import {
    assessmentQuestionsMessages,
    assessmentReportMessages,
    chatSuggestionsMessages,
    chatSystemMessage,
    compareMessages,
    Lang,
    marketMessages,
    recommendationsMessages,
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
