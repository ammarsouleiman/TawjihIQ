// Self-check for the scholarship engine (no network, no API key).
// Run: npx ts-node --transpile-only src/lib/scholarships.check.ts
import assert from "node:assert/strict";
import { keywordsFor, normalizeScholarships, rootDomain } from "./scholarships";
import { searchJSON } from "./openai";

const today = "2026-11-06";
const base = {
  title: "Financial Aid Program", org: "American University of Beirut", category: "University aid", type: "Scholarship",
  level: "Undergraduate", country: "Lebanon", tag: "Partial", amount: "Up to 100% of tuition", deadline: "Feb 1, 2027",
  deadlineISO: "2027-02-01", deadlineStatus: "confirmed", applyUrl: "https://www.aub.edu.lb/admissions/financial-aid",
  sourceUrls: ["https://www.aub.edu.lb/admissions/financial-aid"], match: 88, whyFit: "x", description: "y",
  requirements: [{ text: "Lebanese Baccalaureate", status: "met" }, { text: "SAT", status: "bogus" }], documents: ["Transcript"], nextStep: "Apply",
};

function run() {
  // 1. Confirmed date backed by a live search of the same domain stays confirmed.
  let out = normalizeScholarships([base], { live: true, today, searchSources: ["https://admissions.aub.edu.lb/x"] });
  assert.equal(out.length, 1);
  assert.equal(out[0].deadlineStatus, "confirmed");
  assert.equal(out[0].deadlineISO, "2027-02-01");
  assert.equal(out[0].requirements[1].status, "unknown", "unknown requirement status is normalized");

  // 2. Same claim without search evidence is downgraded to an estimate.
  out = normalizeScholarships([base], { live: true, today, searchSources: ["https://example.org/a"] });
  assert.equal(out[0].deadlineStatus, "estimated");
  out = normalizeScholarships([base], { live: false, today, searchSources: [] });
  assert.equal(out[0].deadlineStatus, "estimated");

  // 3. Expired confirmed deadline is dropped; expired estimate just loses its date.
  out = normalizeScholarships([{ ...base, deadlineISO: "2026-01-10" }], { live: true, today, searchSources: ["https://aub.edu.lb"] });
  assert.equal(out.length, 0);
  out = normalizeScholarships([{ ...base, deadlineISO: "2026-01-10", deadlineStatus: "estimated" }], { live: true, today, searchSources: [] });
  assert.equal(out.length, 1);
  assert.equal(out[0].deadlineISO, undefined);

  // 4. Blocked / insecure links, postgraduate-only programs, bad enums and duplicates are rejected.
  out = normalizeScholarships(
    [
      { ...base, applyUrl: "https://www.facebook.com/aub" },
      { ...base, applyUrl: "http://www.aub.edu.lb/aid" },
      { ...base, title: "Chevening", level: "Master's" },
      { ...base, tag: "Free money" },
      base,
      { ...base },
    ],
    { live: true, today, searchSources: ["https://aub.edu.lb"] }
  );
  assert.equal(out.length, 1, "only one valid, de-duplicated entry remains");

  // 5. Helpers.
  assert.equal(rootDomain("admissions.aub.edu.lb"), "aub.edu.lb");
  assert.equal(rootDomain("www.daad.de"), "daad.de");
  assert.deepEqual(keywordsFor("AUB Merit Scholarship", "American University of Beirut"), ["aub", "american", "beirut"]);
  console.log("normalize: all checks passed");
}

// 6. Parsing of a Responses API payload (fetch mocked).
async function parseCheck() {
  process.env.OPENAI_API_KEY = "test";
  const payload = {
    output: [
      { type: "web_search_call", action: { sources: [{ url: "https://www.aub.edu.lb/aid" }] } },
      {
        type: "message",
        content: [{ type: "output_text", text: '```json\n{"scholarships":[{"title":"A"}]}\n```', annotations: [{ type: "url_citation", url: "https://lau.edu.lb/fa" }] }],
      },
    ],
  };
  let sentBody: Record<string, unknown> = {};
  globalThis.fetch = (async (_url: string, init: { body: string }) => {
    sentBody = JSON.parse(init.body);
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as unknown as typeof fetch;
  const r = await searchJSON<{ scholarships: { title: string }[] }>({ instructions: "i", input: "x", country: "LB" });
  assert.equal(r.data.scholarships[0].title, "A");
  assert.deepEqual(r.sources.sort(), ["https://lau.edu.lb/fa", "https://www.aub.edu.lb/aid"]);
  assert.equal((sentBody.tools as { type: string }[])[0].type, "web_search");
  assert.equal(sentBody.tool_choice, "required");
  console.log("searchJSON parse: all checks passed");
}

run();
void parseCheck();
