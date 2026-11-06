// Scholarship engine: live web search first, honest fallback second, then
// strict server-side validation so students only see trustworthy entries.

import { chatJSON, searchJSON } from "./openai";
import { Lang, scholarshipSearchPrompt, scholarshipsMessages, UserProfile } from "./prompts";

export const SCHOLARSHIP_TYPES = ["Scholarship", "Fellowship", "Grant", "Internship", "Program"] as const;
export const FUNDING_TYPES = ["Fully Funded", "Partial", "Stipend", "Certificate", "Paid Internship"] as const;
export const SCHOLARSHIP_CATEGORIES = ["University aid", "Government", "Foundation", "Program"] as const;
export const DEADLINE_STATUSES = ["confirmed", "estimated", "rolling", "unknown"] as const;
const REQUIREMENT_STATUSES = ["met", "missing", "unknown"] as const;

// Social networks, news and aggregator sites are never acceptable links.
export const BLOCKED_HOSTS = [
  "facebook.com", "instagram.com", "linkedin.com", "x.com", "twitter.com", "tiktok.com", "youtube.com",
  "t.me", "whatsapp.com", "medium.com", "blogspot.com", "wordpress.com",
  "scholarshippositions.com", "opportunitiesforafricans.com", "scholarshiproar.com", "scholars4dev.com",
  "opportunitydesk.org", "afterschoolafrica.com", "scholarshipdb.net", "studyportals.com", "mastersportal.com",
  "bachelorsportal.com", "scholarship-positions.com", "youthop.com", "worldscholarshipforum.com",
];

export type Verification = "verified" | "link" | "none";

export type ScholarshipItem = {
  v: 2;
  id: string;
  title: string;
  org: string;
  category: typeof SCHOLARSHIP_CATEGORIES[number];
  type: typeof SCHOLARSHIP_TYPES[number];
  level: string;
  country: string;
  tag: typeof FUNDING_TYPES[number];
  amount?: string;
  deadline: string;
  deadlineISO?: string;
  deadlineStatus: typeof DEADLINE_STATUSES[number];
  applyUrl: string;
  sourceUrls: string[];
  match: number;
  whyFit?: string;
  description?: string;
  requirements: { text: string; status: typeof REQUIREMENT_STATUSES[number] }[];
  documents: string[];
  nextStep?: string;
  verification: Verification;
  verifiedAt?: string;
};

export type ScholarshipResult = {
  scholarships: ScholarshipItem[];
  generatedAt: string;
  mode: "live" | "fallback";
  targetLevel?: string;
};

function canonicalEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return allowed.find((item) => item.toLowerCase() === normalized) ?? null;
}

const text = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Registrable-ish root, e.g. "admissions.aub.edu.lb" -> "aub.edu.lb". */
export function rootDomain(host: string): string {
  const parts = host.split(".");
  const twoLevelTld = parts.length >= 3 && /^(edu|gov|org|com|ac|net|gob|go|co)$/.test(parts[parts.length - 2]);
  return parts.slice(twoLevelTld ? -3 : -2).join(".");
}

export function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".")) return false;
    return !BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`));
  } catch {
    return false;
  }
}

/**
 * Pure normalization of the model's raw output (no network). Drops malformed,
 * blocked, duplicate and expired entries, and downgrades any claim that the
 * evidence does not support.
 */
export function normalizeScholarships(
  raw: unknown[],
  opts: { live: boolean; today: string; searchSources: string[] }
): Omit<ScholarshipItem, "verification" | "verifiedAt">[] {
  const sourceRoots = new Set(
    opts.searchSources.map(hostOf).filter((h): h is string => !!h).map(rootDomain)
  );
  const seen = new Set<string>();
  const out: Omit<ScholarshipItem, "verification" | "verifiedAt">[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const s = entry as Record<string, unknown>;
    const type = canonicalEnum(s.type, SCHOLARSHIP_TYPES);
    const tag = canonicalEnum(s.tag, FUNDING_TYPES);
    const category = canonicalEnum(s.category, SCHOLARSHIP_CATEGORIES) ?? (type === "Program" ? "Program" : "Foundation");
    const title = text(s.title, 160);
    const org = text(s.org, 160);
    const country = text(s.country, 60);
    const applyUrl = text(s.applyUrl, 500);
    if (!type || !tag || !title || !org || !country || !isAllowedUrl(applyUrl)) continue;

    // Postgraduate-only programs are never shown to school students.
    const level = text(s.level, 60);
    if (/\b(master'?s?|phd|doctoral|postgraduate|post-graduate)\b/i.test(level) && !/\b(bachelor|undergrad)/i.test(level)) continue;

    const key = `${title.toLowerCase()}|${org.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let deadlineStatus = canonicalEnum(s.deadlineStatus, DEADLINE_STATUSES) ?? "unknown";
    let deadlineISO = /^\d{4}-\d{2}-\d{2}$/.test(text(s.deadlineISO, 10)) ? text(s.deadlineISO, 10) : "";
    // A past exact date means the cycle is over.
    if (deadlineISO && deadlineISO < opts.today) {
      if (deadlineStatus === "confirmed") continue;
      deadlineISO = "";
    }
    const sourceUrls = (Array.isArray(s.sourceUrls) ? s.sourceUrls : [])
      .map((u) => text(u, 500))
      .filter((u) => isAllowedUrl(u))
      .slice(0, 3);
    const applyRoot = rootDomain(hostOf(applyUrl) ?? "");
    // A "confirmed" date must come from a live search that actually visited
    // the organization's own domain; otherwise it is only an estimate.
    const backedBySearch = opts.live && (sourceRoots.has(applyRoot) || sourceUrls.some((u) => sourceRoots.has(rootDomain(hostOf(u) ?? ""))));
    if (deadlineStatus === "confirmed" && (!backedBySearch || !deadlineISO)) deadlineStatus = deadlineISO ? "estimated" : "unknown";
    if (deadlineStatus !== "confirmed") deadlineISO = deadlineStatus === "estimated" ? deadlineISO : "";

    const requirements = (Array.isArray(s.requirements) ? s.requirements : [])
      .map((r) => {
        if (!r || typeof r !== "object") return null;
        const rr = r as Record<string, unknown>;
        const t = text(rr.text, 200);
        if (!t) return null;
        return { text: t, status: canonicalEnum(rr.status, REQUIREMENT_STATUSES) ?? "unknown" };
      })
      .filter((r): r is { text: string; status: typeof REQUIREMENT_STATUSES[number] } => !!r)
      .slice(0, 6);

    out.push({
      v: 2,
      id: (text(s.id, 80) || key).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title,
      org,
      category,
      type,
      level: level || "Undergraduate",
      country,
      tag,
      amount: text(s.amount, 200) || undefined,
      deadline: text(s.deadline, 160) || "—",
      deadlineISO: deadlineISO || undefined,
      deadlineStatus,
      applyUrl,
      sourceUrls: sourceUrls.length ? sourceUrls : [applyUrl],
      match: Math.max(0, Math.min(100, Math.round(Number(s.match) || 0))),
      whyFit: text(s.whyFit, 400) || undefined,
      description: text(s.description, 400) || undefined,
      requirements,
      documents: (Array.isArray(s.documents) ? s.documents : []).map((d) => text(d, 120)).filter(Boolean).slice(0, 6),
      nextStep: text(s.nextStep, 240) || undefined,
    });
  }
  return out;
}

// Words that say nothing about which program a page is about.
const GENERIC_WORDS = new Set([
  "scholarship", "scholarships", "program", "programme", "programs", "university", "foundation", "grant",
  "grants", "fund", "funding", "award", "awards", "merit", "financial", "student", "students", "international",
  "government", "national", "undergraduate", "bachelor", "study", "studies", "summer", "school", "the", "for", "and",
]);

/** Distinctive words of a program, used to check that a page is about it. */
export function keywordsFor(title: string, org: string): string[] {
  const words = `${title} ${org}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC_WORDS.has(w));
  return [...new Set(words)];
}

/**
 * Fetch the page and check it is reachable, still on an allowed domain, and
 * mentions the program (rules out dead links that redirect to a home page).
 */
async function checkPage(url: string, keywords: string[]): Promise<{ reachable: boolean; mentions: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; TawjihIQ/1.0; +https://tawjihiq.com)", Accept: "text/html,*/*" },
    });
    if (res.status < 200 || res.status >= 400 || !isAllowedUrl(res.url)) return { reachable: false, mentions: false };
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      while (html.length < 400_000) {
        const { value, done } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
      void reader.cancel().catch(() => {});
    }
    const page = html.toLowerCase().normalize("NFKD");
    const hits = keywords.filter((k) => page.includes(k)).length;
    const needed = Math.min(2, keywords.length);
    return { reachable: true, mentions: needed > 0 && hits >= needed };
  } catch {
    return { reachable: false, mentions: false };
  } finally {
    clearTimeout(timer);
  }
}

const COUNTRY_CODES: Record<string, string> = {
  lebanon: "LB", syria: "SY", jordan: "JO", iraq: "IQ", egypt: "EG", palestine: "PS",
  "saudi arabia": "SA", "united arab emirates": "AE", uae: "AE", qatar: "QA", kuwait: "KW", oman: "OM", bahrain: "BH",
};

/** Generate, validate and verify scholarships for one student. */
export async function findScholarships(profile: UserProfile, lang: Lang): Promise<ScholarshipResult> {
  const today = new Date().toISOString().slice(0, 10);
  let mode: "live" | "fallback" = "live";
  let raw: unknown[] = [];
  let targetLevel: string | undefined;
  let searchSources: string[] = [];

  try {
    const { instructions, input } = scholarshipSearchPrompt(profile, lang);
    const country = COUNTRY_CODES[String((profile as Record<string, unknown>).country ?? "lebanon").trim().toLowerCase()] ?? "LB";
    const result = await searchJSON<{ scholarships?: unknown[]; targetLevel?: string }>({ instructions, input, country });
    raw = Array.isArray(result.data?.scholarships) ? result.data.scholarships : [];
    targetLevel = text(result.data?.targetLevel, 120) || undefined;
    searchSources = result.sources;
    if (raw.length === 0) throw new Error("web search returned no scholarships");
  } catch (err) {
    console.warn("[scholarships] live search unavailable, using fallback:", err instanceof Error ? err.message : err);
    mode = "fallback";
    const result = await chatJSON<{ scholarships?: unknown[]; targetLevel?: string }>(scholarshipsMessages(profile, lang), 0.2);
    raw = Array.isArray(result?.scholarships) ? result.scholarships : [];
    targetLevel = text(result?.targetLevel, 120) || undefined;
  }

  const items = normalizeScholarships(raw, { live: mode === "live", today, searchSources });
  const checked = await Promise.all(
    items.map(async (it): Promise<ScholarshipItem> => {
      const page = await checkPage(it.applyUrl, keywordsFor(it.title, it.org));
      const verification: Verification = page.reachable && page.mentions ? "verified" : page.reachable ? "link" : "none";
      // Without a reachable official page we cannot stand behind a confirmed date.
      const deadlineStatus = it.deadlineStatus === "confirmed" && verification === "none" ? "estimated" : it.deadlineStatus;
      return { ...it, deadlineStatus, verification, verifiedAt: verification !== "none" ? today : undefined };
    })
  );

  // Verified first, then by match.
  const rank = { verified: 0, link: 1, none: 2 } as const;
  checked.sort((a, b) => rank[a.verification] - rank[b.verification] || b.match - a.match);
  return { scholarships: checked, generatedAt: new Date().toISOString(), mode, targetLevel };
}
