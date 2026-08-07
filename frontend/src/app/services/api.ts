import { useEffect, useState } from "react";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  "http://localhost:5000/api";

// ---- Types (shared with the backend content) ------------------------------
export type RankedUniversity = { rank: number; name: string; note: string };

export type Major = {
  id: string;
  name: string;
  match: number;
  category: string;
  why: string;
  skills: string[];
  careers: string[];
  difficulty: "Moderate" | "Challenging" | "Intensive";
  localDemand: number;
  globalDemand: number;
  salary: "Medium" | "High" | "Very High";
  duration: string;
  overview: string;
  personality: string;
  subjects: string[];
  universities: RankedUniversity[];
  pros: string[];
  cons: string[];
  courses: string[];
};

export type MarketField = { name: string; demand: number; trend: string };

// ---- AI types --------------------------------------------------------------
export type UserProfile = Record<string, unknown>;
export type Lang = "en" | "ar";

export type RoadmapPhase = {
  phase: string;
  timeframe: string;
  focus: string;
  actions: string[];
};

export type TopUniversity = {
  rank: number;
  name: string;
  city: string;
  type: string;
  strongFields: string[];
  note: string;
};

export type Recommendations = {
  summary: string;
  strengths: string[];
  gaps: string[];
  majors: Major[];
  roadmap: RoadmapPhase[];
  topUniversities: TopUniversity[];
};

export type MarketInsights = {
  insight: string;
  fields: MarketField[];
  regional: { region: string; fields: string }[];
};

export type ComparisonRow = {
  criterion: string;
  values: string[];
  winner: number;
};

export type Comparison = {
  majors: string[];
  rows: ComparisonRow[];
  verdict: { bestFor: string; reason: string };
};

// ---- AI Assessment ---------------------------------------------------------
export type AssessmentQuestion = {
  id: string;
  type: "choice" | "scale";
  prompt: string;
  dimension: string;
  options?: string[];
  scaleLabels?: { low: string; high: string };
};

export type AssessmentQuestions = {
  intro: string;
  questions: AssessmentQuestion[];
};

export type AssessmentAnswer = {
  question: string;
  answer: string;
  dimension?: string;
};

export type AssessmentDimension = {
  name: string;
  score: number;
  insight: string;
};

export type AssessmentReport = {
  archetype: { title: string; tagline: string };
  readinessScore: number;
  summary: string;
  dimensions: AssessmentDimension[];
  strengths: string[];
  blindSpots: string[];
  workValues: string[];
  directions: { title: string; why: string }[];
  nextSteps: string[];
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type Scholarship = {
  id: string;
  title: string;
  org: string;
  type: string;
  deadline: string;
  country: string;
  tag: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
};

// ---- Low-level fetch helper ------------------------------------------------
async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return (await res.json()) as T;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Request to ${path} failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export const api = {
  majors: () => getJSON<Major[]>("/majors"),
  major: (id: string) => getJSON<Major>(`/majors/${id}`),
  market: () => getJSON<MarketField[]>("/market"),
  scholarships: () => getJSON<Scholarship[]>("/scholarships"),
  skills: () => getJSON<string[]>("/config/skills"),
  fields: () => getJSON<string[]>("/config/fields"),
  chatSuggestions: () => getJSON<string[]>("/config/chat-suggestions"),
  notifications: () => getJSON<AppNotification[]>("/notifications"),
};

// ---- AI (generated from the real user profile) -----------------------------
export const ai = {
  recommendations: (profile: UserProfile, lang: Lang) =>
    postJSON<Recommendations>("/ai/recommendations", { profile, lang }),
  market: (profile: UserProfile, lang: Lang) =>
    postJSON<MarketInsights>("/ai/market", { profile, lang }),
  compare: (profile: UserProfile, majors: string[], lang: Lang, focus?: string) =>
    postJSON<Comparison>("/ai/compare", { profile, majors, lang, focus }),
  chatSuggestions: (profile: UserProfile, lang: Lang) =>
    postJSON<{ suggestions: string[] }>("/ai/chat-suggestions", { profile, lang }),
  assessmentQuestions: (profile: UserProfile, lang: Lang, context?: unknown) =>
    postJSON<AssessmentQuestions>("/ai/assessment/questions", { profile, lang, context }),
  assessmentReport: (
    profile: UserProfile,
    answers: AssessmentAnswer[],
    lang: Lang,
    context?: unknown
  ) => postJSON<AssessmentReport>("/ai/assessment/report", { profile, answers, lang, context }),
  chat: (messages: ChatTurn[], profile: UserProfile, lang: Lang) =>
    postJSON<{ reply: string }>("/ai/chat", { messages, profile, lang }),
  // Localize already-generated content into `lang` WITHOUT regenerating it:
  // only human-readable text is translated; numbers, scores and the enum/slug
  // fields listed in `preserve` are kept identical.
  translate: <T>(data: T, lang: Lang, preserve?: string[]) =>
    postJSON<T>("/ai/translate", { data, lang, preserve }),
};

// ---- Authentication --------------------------------------------------------
export type AuthUser = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: AuthUser };

export const auth = {
  signup: (name: string, email: string, password: string) =>
    postJSON<AuthResponse>("/auth/signup", { name, email, password }),
  login: (email: string, password: string) =>
    postJSON<AuthResponse>("/auth/login", { email, password }),
  updateAccount: async (
    token: string,
    patch: {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    }
  ) => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.json())?.error ?? "";
      } catch {
        /* ignore */
      }
      throw new Error(detail || `Update account failed (${res.status})`);
    }
    return (await res.json()) as AuthResponse;
  },
  deleteAccount: async (token: string) => {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.json())?.error ?? "";
      } catch {
        /* ignore */
      }
      throw new Error(detail || `Delete account failed (${res.status})`);
    }
    return (await res.json()) as { ok: true };
  },
};

// ---- Generic data hook -----------------------------------------------------
type AsyncState<T> = { data: T; loading: boolean; error: string | null };

function useApi<T>(fetcher: () => Promise<T>, fallback: T): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: fallback,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active)
          setState({
            data: fallback,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

// ---- Ready-to-use hooks ----------------------------------------------------
export const useMajors = () => useApi<Major[]>(api.majors, []);
export const useMarket = () => useApi<MarketField[]>(api.market, []);
export const useScholarships = () => useApi<Scholarship[]>(api.scholarships, []);
export const useSkills = () => useApi<string[]>(api.skills, []);
export const useFields = () => useApi<string[]>(api.fields, []);
export const useChatSuggestions = () =>
  useApi<string[]>(api.chatSuggestions, []);
export const useNotifications = () =>
  useApi<AppNotification[]>(api.notifications, []);
