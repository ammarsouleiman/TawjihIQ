import { ClipboardList, GraduationCap, Home, Languages, Loader2, Sparkles, User } from "lucide-react";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import {
  ai,
  auth as authApi,
  AuthUser,
  Major,
  MarketInsights,
  Recommendations,
  Scholarship,
  UserProfile,
} from "../services/api";
import { Lang, translate, translateData } from "./i18n";

export type Screen =
  | "splash"
  | "welcome"
  | "login"
  | "signup"
  | "forgot"
  | "onboarding"
  | "setup"
  | "home"
  | "assessment"
  | "assessmentReport"
  | "analyzing"
  | "results"
  | "major"
  | "compare"
  | "explore"
  | "universities"
  | "market"
  | "scholarships"
  | "chat"
  | "shortlist"
  | "notifications"
  | "profile"
  | "settings"
  | "editAccount"
  | "premium"
  | "report";

type NavState = {
  screen: Screen;
  go: (s: Screen, payload?: unknown, opts?: { replace?: boolean }) => void;
  back: () => void;
  payload: unknown;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  td: (text: string) => string;
  rtl: boolean;
  dark: boolean;
  setDark: (d: boolean) => void;
  // ---- Real user data + AI-generated content ----
  langCode: "en" | "ar";
  profile: UserProfile;
  updateProfile: (patch: UserProfile) => void;
  profileCompletion: number;
  profileComplete: boolean;
  recommendations: Recommendations | null;
  recStatus: "idle" | "loading" | "ready" | "error";
  recError: string | null;
  generateRecommendations: () => Promise<void>;
  market: MarketInsights | null;
  marketStatus: "idle" | "loading" | "ready" | "error";
  loadMarket: () => Promise<void>;
  // True while previously-generated AI content is being translated after a
  // language switch (drives the full-screen translating overlay).
  translating: boolean;
  // ---- Saved majors (shortlist) ----
  savedMajors: Major[];
  toggleSaveMajor: (major: Major) => void;
  isMajorSaved: (id: string) => boolean;
  // ---- Saved scholarships ----
  savedScholarships: Scholarship[];
  toggleSaveScholarship: (scholarship: Scholarship) => void;
  isScholarshipSaved: (id: string) => boolean;
  // ---- Authentication ----
  user: AuthUser | null;
  token: string | null;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateAccount: (patch: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const NavCtx = createContext<NavState | null>(null);
export const useNav = () => {
  const ctx = useContext(NavCtx);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
};

const PROFILE_KEY = "tjq.profile";
const REC_KEY = "tjq.recommendations";
const REC_BASE_KEY = "tjq.recommendations.base";
const MARKET_KEY = "tjq.market";
const MARKET_BASE_KEY = "tjq.market.base";
const SAVED_KEY = "tjq.savedMajors";
const SAVED_SCH_KEY = "tjq.savedScholarships";
const TOKEN_KEY = "tjq.token";
const USER_KEY = "tjq.user";

// Enum/slug fields the UI relies on (filtering, matching). When we localize
// AI content we must keep these EXACTLY as generated — only prose is translated.
const REC_PRESERVE = ["id", "category", "difficulty", "salary", "type"];
const MARKET_PRESERVE: string[] = [];

// Per-user storage key so each account's data stays isolated.
const scopedKey = (base: string, uid: string | null) => `${base}:${uid ?? "guest"}`;

// Fields we count toward the profile-completion percentage.
// (These are exactly the fields collected by the profile setup form. The q1-q5
// AI assessment is a separate optional quiz, so it is not counted here.)
const COMPLETION_FIELDS = [
  "fullName",
  "age",
  "country",
  "educationLevel",
  "gpa",
  "favoriteSubjects",
  "interests",
  "fields",
  "workStyle",
  "skills",
  "personality",
];

// The minimum personal-info fields required before a user may enter the app.
const REQUIRED_PERSONAL_FIELDS = [
  "fullName",
  "age",
  "country",
  "city",
  "school",
  "educationLevel",
  "preferredLanguage",
];

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function computeCompletion(profile: UserProfile): number {
  let filled = 0;
  for (const key of COMPLETION_FIELDS) {
    const v = profile[key];
    if (v == null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)
      continue;
    filled++;
  }
  return Math.round((filled / COMPLETION_FIELDS.length) * 100);
}

// True only when the user has filled the mandatory personal-info fields.
function isProfileComplete(profile: UserProfile): boolean {
  return REQUIRED_PERSONAL_FIELDS.every((key) => {
    const v = profile[key];
    return typeof v === "string" && v.trim() !== "";
  });
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<{ screen: Screen; payload: unknown }[]>([
    { screen: "splash", payload: null },
  ]);
  const [lang, setLang] = useState<Lang>("EN");
  const [dark, setDark] = useState(false);
  const top = stack[stack.length - 1];
  const screen = top.screen;
  const payload = top.payload;
  const rtl = lang === "AR";
  const langCode: "en" | "ar" = lang === "AR" ? "ar" : "en";
  const t = (key: string) => translate(key, lang);
  const td = (text: string) => translateData(text, lang);

  // ---- Auth state (declared first so per-user data can be scoped by id) ----
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<AuthUser | null>(() =>
    loadStored<AuthUser | null>(USER_KEY, null)
  );

  // ---- Real profile + AI state (scoped per authenticated user) ----
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadStored<UserProfile>(scopedKey(PROFILE_KEY, user?.id ?? null), {})
  );
  const [recByLang, setRecByLang] = useState<Partial<Record<"en" | "ar", Recommendations>>>(
    () => loadStored<Partial<Record<"en" | "ar", Recommendations>>>(scopedKey(REC_KEY, user?.id ?? null), {})
  );
  const recommendations = recByLang[langCode] ?? null;
  const [recStatus, setRecStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(() =>
    loadStored<Partial<Record<"en" | "ar", Recommendations>>>(scopedKey(REC_KEY, user?.id ?? null), {})[langCode]
      ? "ready"
      : "idle"
  );
  const [recError, setRecError] = useState<string | null>(null);
  // The language the recommendations were originally GENERATED in (the
  // canonical source). Other languages are produced by translating this — never
  // regenerated — so scores/majors stay identical across languages.
  const [recBaseLang, setRecBaseLang] = useState<"en" | "ar" | null>(() =>
    loadStored<"en" | "ar" | null>(scopedKey(REC_BASE_KEY, user?.id ?? null), null)
  );
  const [marketByLang, setMarketByLang] = useState<Partial<Record<"en" | "ar", MarketInsights>>>(
    () => loadStored<Partial<Record<"en" | "ar", MarketInsights>>>(scopedKey(MARKET_KEY, user?.id ?? null), {})
  );
  const market = marketByLang[langCode] ?? null;
  const [marketStatus, setMarketStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >(() =>
    loadStored<Partial<Record<"en" | "ar", MarketInsights>>>(scopedKey(MARKET_KEY, user?.id ?? null), {})[langCode]
      ? "ready"
      : "idle"
  );
  const [marketBaseLang, setMarketBaseLang] = useState<"en" | "ar" | null>(() =>
    loadStored<"en" | "ar" | null>(scopedKey(MARKET_BASE_KEY, user?.id ?? null), null)
  );
  // True while previously-generated AI content is being translated after a
  // language switch. Drives a full-screen "translating the app" overlay.
  const [translating, setTranslating] = useState(false);
  const [savedMajors, setSavedMajors] = useState<Major[]>(() =>
    loadStored<Major[]>(scopedKey(SAVED_KEY, user?.id ?? null), [])
  );
  const [savedScholarships, setSavedScholarships] = useState<Scholarship[]>(() =>
    loadStored<Scholarship[]>(scopedKey(SAVED_SCH_KEY, user?.id ?? null), [])
  );

  const applyAuth = (nextToken: string, nextUser: AuthUser) => {
    setTokenState(nextToken);
    setUser(nextUser);
    try {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } catch {
      /* ignore */
    }
  };

  // Load a specific user's isolated data. New accounts start fresh; returning
  // users get their own saved profile back — never another user's data.
  // Returns the resolved profile so callers can gate navigation on it.
  const loadUserData = (uid: string | null, seedName?: string): UserProfile => {
    const storedProfile = loadStored<UserProfile>(scopedKey(PROFILE_KEY, uid), {});
    const nextProfile = seedName
      ? { ...storedProfile, fullName: seedName }
      : storedProfile;
    setProfile(nextProfile);
    const recMap = loadStored<Partial<Record<"en" | "ar", Recommendations>>>(scopedKey(REC_KEY, uid), {});
    setRecByLang(recMap);
    setRecBaseLang(loadStored<"en" | "ar" | null>(scopedKey(REC_BASE_KEY, uid), null));
    setRecStatus(recMap[langCode] ? "ready" : "idle");
    setRecError(null);
    setSavedMajors(loadStored<Major[]>(scopedKey(SAVED_KEY, uid), []));
    setSavedScholarships(loadStored<Scholarship[]>(scopedKey(SAVED_SCH_KEY, uid), []));
    const mktMap = loadStored<Partial<Record<"en" | "ar", MarketInsights>>>(scopedKey(MARKET_KEY, uid), {});
    setMarketByLang(mktMap);
    setMarketBaseLang(loadStored<"en" | "ar" | null>(scopedKey(MARKET_BASE_KEY, uid), null));
    setMarketStatus(mktMap[langCode] ? "ready" : "idle");
    return nextProfile;
  };

  const signup = async (name: string, email: string, password: string) => {
    const res = await authApi.signup(name, email, password);
    applyAuth(res.token, res.user);
    // Fresh account: reset any leftover data and seed the account name, then
    // send the user to fill their info.
    loadUserData(res.user.id, name);
    go("onboarding");
  };

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    applyAuth(res.token, res.user);
    // Restore only this user's saved data, then gate entry on completeness:
    // users who never filled their personal info must complete Setup first.
    const loaded = loadUserData(res.user.id);
    go(isProfileComplete(loaded) ? "home" : "setup");
  };

  const logout = () => {
    setTokenState(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
    loadUserData(null);
  };

  const updateAccount = async (patch: {
    name?: string;
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    if (!token) throw new Error("Not authenticated.");
    const res = await authApi.updateAccount(token, patch);
    applyAuth(res.token, res.user);
  };

  const deleteAccount = async () => {
    if (token) await authApi.deleteAccount(token);
    // Wipe this user's isolated local data, then sign out completely.
    const uid = user?.id ?? null;
    try {
      localStorage.removeItem(scopedKey(PROFILE_KEY, uid));
      localStorage.removeItem(scopedKey(REC_KEY, uid));
      localStorage.removeItem(scopedKey(REC_BASE_KEY, uid));
      localStorage.removeItem(scopedKey(MARKET_KEY, uid));
      localStorage.removeItem(scopedKey(MARKET_BASE_KEY, uid));
      localStorage.removeItem(scopedKey(SAVED_KEY, uid));
      localStorage.removeItem(scopedKey(SAVED_SCH_KEY, uid));
      localStorage.removeItem(scopedKey("tjq.chat", uid));
    } catch {
      /* ignore */
    }
    logout();
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKey(PROFILE_KEY, user?.id ?? null),
        JSON.stringify(profile)
      );
    } catch {
      /* ignore */
    }
  }, [profile, user]);

  useEffect(() => {
    try {
      const key = scopedKey(REC_KEY, user?.id ?? null);
      if (Object.keys(recByLang).length > 0) localStorage.setItem(key, JSON.stringify(recByLang));
      else localStorage.removeItem(key);
      const baseKey = scopedKey(REC_BASE_KEY, user?.id ?? null);
      if (recBaseLang) localStorage.setItem(baseKey, JSON.stringify(recBaseLang));
      else localStorage.removeItem(baseKey);
    } catch {
      /* ignore */
    }
  }, [recByLang, recBaseLang, user]);

  useEffect(() => {
    try {
      const key = scopedKey(MARKET_KEY, user?.id ?? null);
      if (Object.keys(marketByLang).length > 0) localStorage.setItem(key, JSON.stringify(marketByLang));
      else localStorage.removeItem(key);
      const baseKey = scopedKey(MARKET_BASE_KEY, user?.id ?? null);
      if (marketBaseLang) localStorage.setItem(baseKey, JSON.stringify(marketBaseLang));
      else localStorage.removeItem(baseKey);
    } catch {
      /* ignore */
    }
  }, [marketByLang, marketBaseLang, user]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKey(SAVED_KEY, user?.id ?? null),
        JSON.stringify(savedMajors)
      );
    } catch {
      /* ignore */
    }
  }, [savedMajors, user]);

  useEffect(() => {
    try {
      localStorage.setItem(
        scopedKey(SAVED_SCH_KEY, user?.id ?? null),
        JSON.stringify(savedScholarships)
      );
    } catch {
      /* ignore */
    }
  }, [savedScholarships, user]);

  const toggleSaveMajor = (major: Major) =>
    setSavedMajors((prev) =>
      prev.some((m) => m.id === major.id)
        ? prev.filter((m) => m.id !== major.id)
        : [...prev, major]
    );
  const isMajorSaved = (id: string) => savedMajors.some((m) => m.id === id);

  const toggleSaveScholarship = (scholarship: Scholarship) =>
    setSavedScholarships((prev) =>
      prev.some((s) => s.id === scholarship.id)
        ? prev.filter((s) => s.id !== scholarship.id)
        : [...prev, scholarship]
    );
  const isScholarshipSaved = (id: string) =>
    savedScholarships.some((s) => s.id === id);

  const updateProfile = (patch: UserProfile) =>
    setProfile((prev) => ({ ...prev, ...patch }));

  const profileCompletion = computeCompletion(profile);
  const profileComplete = isProfileComplete(profile);

  const generateRecommendations = async () => {
    setRecStatus("loading");
    setRecError(null);
    try {
      const result = await ai.recommendations(profile, langCode);
      setRecByLang((prev) => ({ ...prev, [langCode]: result }));
      setRecBaseLang(langCode);
      setRecStatus("ready");
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Failed to generate recommendations.");
      setRecStatus("error");
    }
  };

  const loadMarket = async () => {
    setMarketStatus("loading");
    try {
      const result = await ai.market(profile, langCode);
      setMarketByLang((prev) => ({ ...prev, [langCode]: result }));
      setMarketBaseLang(langCode);
      setMarketStatus("ready");
    } catch {
      setMarketStatus("error");
    }
  };

  // Tracks the language of the previous render so the sync effect can tell a
  // real toggle apart from a mount/refresh.
  const prevLangRef = useRef(langCode);

  // Keep AI content in sync with the app language WITHOUT re-thinking it.
  // Content is generated ONCE (in the base language). On EVERY language switch
  // we re-TRANSLATE that canonical content into the newly selected language —
  // scores/enums stay identical, only the prose is localized — and show the
  // translating overlay while it runs. The base language itself is already
  // native, so switching to it is instant (nothing to translate).
  //
  // All AI blocks (recommendations + market + report) are bundled into ONE
  // translate request so the user only ever triggers a single round-trip.
  useEffect(() => {
    let active = true;

    // Distinguish a real language toggle from a plain mount/refresh. On refresh
    // (not a switch) we must NOT re-translate anything that is already cached in
    // the target language — otherwise every page reload fires a translate call.
    const isSwitch = prevLangRef.current !== langCode;
    prevLangRef.current = langCode;

    const p = profile as Record<string, unknown>;
    const reportByLang = (p.assessmentReportByLang ?? {}) as Partial<
      Record<"en" | "ar", unknown>
    >;
    const reportBaseLang = (p.assessmentReportBaseLang ?? null) as "en" | "ar" | null;
    const reportCanonical = (reportBaseLang
      ? reportByLang[reportBaseLang]
      : p.assessmentReport) as unknown;

    // We translate a block whenever the target language differs from the
    // language it was authored in AND either the user just switched languages
    // (re-translate for freshness) or we don't yet have that language cached.
    const needRec =
      !!recBaseLang && recBaseLang !== langCode && !!recByLang[recBaseLang] && (isSwitch || !recByLang[langCode]);
    const needMkt =
      !!marketBaseLang && marketBaseLang !== langCode && !!marketByLang[marketBaseLang] && (isSwitch || !marketByLang[langCode]);
    const needReport =
      !!reportCanonical &&
      (reportBaseLang ? reportBaseLang !== langCode : !reportByLang[langCode]) &&
      (isSwitch || !reportByLang[langCode]);

    // Blocks that don't need a network translate resolve their status instantly.
    if (!needRec) {
      setRecStatus(
        (recBaseLang && recByLang[recBaseLang]) || recByLang[langCode] ? "ready" : "idle"
      );
    }
    if (!needMkt) {
      setMarketStatus(
        (marketBaseLang && marketByLang[marketBaseLang]) || marketByLang[langCode]
          ? "ready"
          : "idle"
      );
    }

    if (!needRec && !needMkt && !needReport) {
      return () => {
        active = false;
      };
    }

    // One combined round-trip for everything that needs localizing.
    setTranslating(true);
    if (needRec) setRecStatus("loading");
    if (needMkt) setMarketStatus("loading");

    (async () => {
      const bundle: {
        recommendations?: Recommendations;
        market?: MarketInsights;
        report?: unknown;
      } = {};
      if (needRec) bundle.recommendations = recByLang[recBaseLang!];
      if (needMkt) bundle.market = marketByLang[marketBaseLang!];
      if (needReport) bundle.report = reportCanonical;

      try {
        const out = await ai.translate<typeof bundle>(bundle, langCode, REC_PRESERVE);
        if (!active) return;
        if (needRec) {
          const value = out.recommendations ?? recByLang[recBaseLang!]!;
          setRecByLang((prev) => ({ ...prev, [langCode]: value }));
          setRecStatus("ready");
        }
        if (needMkt) {
          const value = out.market ?? marketByLang[marketBaseLang!]!;
          setMarketByLang((prev) => ({ ...prev, [langCode]: value }));
          setMarketStatus("ready");
        }
        if (needReport && out.report) {
          updateProfile({
            assessmentReportByLang: { ...reportByLang, [langCode]: out.report },
            assessmentReport: out.report,
          });
        }
      } catch {
        if (!active) return;
        // Degrade gracefully: show the canonical content rather than nothing.
        if (needRec) {
          setRecByLang((prev) => ({ ...prev, [langCode]: recByLang[recBaseLang!]! }));
          setRecStatus("ready");
        }
        if (needMkt) {
          setMarketByLang((prev) => ({
            ...prev,
            [langCode]: marketByLang[marketBaseLang!]!,
          }));
          setMarketStatus("ready");
        }
        /* report: keep the canonical version */
      } finally {
        if (active) setTranslating(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langCode]);

  const go = (s: Screen, p?: unknown, opts?: { replace?: boolean }) => {
    setStack((prev) => {
      const entry = { screen: s, payload: p ?? null };
      // `replace` swaps the current screen instead of stacking on top, so
      // pressing back skips it (e.g. the assessment quiz once the report opens).
      if (opts?.replace) return [...prev.slice(0, -1), entry];
      return [...prev, entry];
    });
  };
  const back = () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  return (
    <NavCtx.Provider
      value={{
        screen,
        go,
        back,
        payload,
        lang,
        setLang,
        t,
        td,
        rtl,
        dark,
        setDark,
        langCode,
        profile,
        updateProfile,
        profileCompletion,
        profileComplete,
        recommendations,
        recStatus,
        recError,
        generateRecommendations,
        market,
        marketStatus,
        loadMarket,
        translating,
        savedMajors,
        toggleSaveMajor,
        isMajorSaved,
        savedScholarships,
        toggleSaveScholarship,
        isScholarshipSaved,
        user,
        token,
        signup,
        login,
        logout,
        updateAccount,
        deleteAccount,
      }}
    >
      {children}
    </NavCtx.Provider>
  );
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  const { rtl, dark, translating } = useNav();
  return (
    <div className="min-h-svh w-full flex items-center justify-center bg-[#e7ebf5] p-4 md:p-8">
      <div className="relative w-full max-w-[390px] h-[844px] rounded-[3rem] bg-black p-2.5 shadow-[0_40px_90px_-20px_rgba(11,21,51,0.55)]">
        <div
          dir={rtl ? "rtl" : "ltr"}
          lang={rtl ? "ar" : "en"}
          id="tjq-phone"
          className={`tjq-app relative h-full w-full overflow-hidden rounded-[2.4rem] bg-[var(--brand-surface)] ${dark ? "tjq-dark" : ""}`}
        >
          <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />
          {children}
          {translating && <TranslatingOverlay />}
        </div>
      </div>
    </div>
  );
}

// Full-screen overlay shown while previously-generated AI content is being
// translated after a language switch — so the user sees a clear "translating"
// state instead of stale or half-translated data.
function TranslatingOverlay() {
  const { t } = useNav();
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8 text-center"
      style={{ background: "linear-gradient(160deg, var(--brand-navy), #1a2c66 60%, #241a66)" }}
    >
      <div className="pointer-events-none absolute -left-16 top-16 h-56 w-56 rounded-full bg-[var(--brand-blue)]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-[var(--brand-purple)]/25 blur-3xl" />
      <div className="relative grid h-28 w-28 place-items-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-[var(--brand-purple)]/30" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-white/10" />
        <div
          className="grid h-20 w-20 place-items-center rounded-full shadow-lg"
          style={{ background: "linear-gradient(135deg,var(--brand-blue),var(--brand-purple))" }}
        >
          <Languages size={38} className="text-white" />
        </div>
      </div>
      <h1 className="mt-6 text-white" style={{ fontSize: 22 }}>
        {t("translating_title")}
      </h1>
      <p className="mt-2 max-w-[16rem] text-[14px] text-blue-100/80">
        {t("translating_sub")}
      </p>
      <div className="mt-6 flex items-center gap-2 text-[13px] text-blue-100/70">
        <Loader2 size={16} className="animate-spin" />
        <span>{t("please_wait")}</span>
      </div>
    </div>
  );
}

export function StatusBar({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-7 pt-3.5 pb-1 text-[13px] ${
        dark ? "text-white" : "text-[var(--brand-navy)]"
      }`}
      style={{ fontWeight: 600 }}
    >
      <span>9:41</span>
      <div className="flex items-center gap-1.5">
        <span>􀙇</span>
        <span className="tracking-tight">TawjihIQ</span>
      </div>
      <span>100%</span>
    </div>
  );
}

const tabs: { key: Screen; labelKey: string; icon: typeof Home }[] = [
  { key: "home", labelKey: "tab_home", icon: Home },
  { key: "assessment", labelKey: "tab_assessment", icon: ClipboardList },
  { key: "explore", labelKey: "tab_majors", icon: GraduationCap },
  { key: "chat", labelKey: "tab_advisor", icon: Sparkles },
  { key: "profile", labelKey: "tab_profile", icon: User },
];

export function BottomTabs() {
  const { screen, go, t, profile } = useNav();
  // If the student already has a Career DNA report, the Assessment tab jumps
  // straight to it; otherwise it starts a fresh assessment (question generation).
  const p = profile as Record<string, unknown>;
  const byLang = (p.assessmentReportByLang ?? {}) as Record<string, unknown>;
  const hasReport = !!p.assessmentReport || Object.keys(byLang).length > 0;
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 border-t border-black/5 bg-white/95 px-3 pb-6 pt-2 backdrop-blur">
      <div className="flex items-center justify-between">
        {tabs.map((tb) => {
          const active =
            tb.key === "assessment"
              ? screen === "assessment" || screen === "assessmentReport"
              : screen === tb.key;
          const Icon = tb.icon;
          const handleClick = () => {
            if (tb.key === "assessment") {
              go(hasReport ? "assessmentReport" : "assessment");
            } else {
              go(tb.key);
            }
          };
          return (
            <button
              key={tb.key}
              onClick={handleClick}
              className="flex flex-1 flex-col items-center gap-1 py-1"
            >
              <Icon
                size={22}
                className={active ? "text-[var(--brand-blue)]" : "text-slate-400"}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={`text-[10px] ${active ? "text-[var(--brand-blue)]" : "text-slate-400"}`}
                style={{ fontWeight: active ? 600 : 500 }}
              >
                {t(tb.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  const id = "tjqg";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-blue)" />
          <stop offset="1" stopColor="var(--brand-purple)" />
        </linearGradient>
      </defs>
      {/* rounded badge */}
      <rect x="2" y="2" width="44" height="44" rx="13" fill={`url(#${id})`} />
      {/* compass ring */}
      <circle cx="24" cy="24" r="13.5" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
      {/* compass needle / path pointing to future */}
      <path d="M24 11 L29 26 L24 22 L19 26 Z" fill="white" />
      <path d="M24 37 L19 22 L24 26 L29 22 Z" fill="white" fillOpacity="0.55" />
      {/* AI spark */}
      <path d="M35 9 l1.1 2.9 2.9 1.1 -2.9 1.1 -1.1 2.9 -1.1 -2.9 -2.9 -1.1 2.9 -1.1 Z" fill="white" />
    </svg>
  );
}

export function Logo({ light = false, size = 28 }: { light?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <LogoMark size={size} />
      <span
        className={light ? "text-white" : "text-[var(--brand-navy)]"}
        style={{ fontWeight: 700, fontSize: size * 0.62, letterSpacing: "-0.02em" }}
      >
        Tawjih<span style={{ color: light ? "#a5b8f5" : "var(--brand-blue)" }}>IQ</span>
      </span>
    </div>
  );
}

export function BackButton({ onBack }: { onBack?: () => void }) {
  const { back, rtl } = useNav();
  return (
    <button
      onClick={onBack ?? back}
      aria-label="Back"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[var(--brand-navy)] shadow-sm"
    >
      {rtl ? "›" : "‹"}
    </button>
  );
}

export function TopBar({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  const { back, rtl } = useNav();
  return (
    <div className="flex items-center gap-3 px-5 pb-2 pt-1">
      <button
        onClick={onBack ?? back}
        className="grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--brand-navy)] shadow-sm"
      >
        {rtl ? "›" : "‹"}
      </button>
      <h2 className="flex-1 truncate">{title}</h2>
      {action}
    </div>
  );
}
