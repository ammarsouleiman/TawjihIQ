// AI chat-completions client.
// Primary provider: OpenAI (reliable). Fallback: OpenRouter free models.
// Both use the OpenAI-compatible /chat/completions schema.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOptions = {
  temperature?: number;
  /** Ask the model to return a strict JSON object. */
  json?: boolean;
};

const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const OPENROUTER_DEFAULT_MODEL = "google/gemma-4-31b-it:free";

// Fallback free models tried in order when OpenRouter is used and the primary
// is rate-limited (429) or unavailable (5xx). Free-tier providers are congested.
const OPENROUTER_FALLBACKS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
];

type Provider = {
  name: "openai" | "openrouter";
  url: string;
  apiKey: string;
  /** Primary model first, then fallbacks. */
  models: string[];
};

/**
 * Build the ordered list of providers to try. OpenAI first (reliable), then
 * OpenRouter (free fallback). Only providers with a configured key are used.
 */
function getProviders(): Provider[] {
  const providers: Provider[] = [];

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const model = process.env.OPENAI_MODEL || OPENAI_DEFAULT_MODEL;
    providers.push({ name: "openai", url: OPENAI_URL, apiKey: openaiKey, models: [model] });
  }

  const routerKey = process.env.OPENROUTER_API_KEY;
  if (routerKey) {
    const model = process.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL;
    const models = [model, ...OPENROUTER_FALLBACKS.filter((m) => m !== model)];
    providers.push({ name: "openrouter", url: OPENROUTER_URL, apiKey: routerKey, models });
  }

  if (providers.length === 0) {
    throw new Error(
      "No AI provider configured. Set OPENAI_API_KEY (recommended) or OPENROUTER_API_KEY in backend/.env."
    );
  }
  return providers;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callModel(
  provider: Provider,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<{ ok: true; content: string } | { ok: false; status: number; detail: string }> {
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
  };
  if (options.json) {
    body.response_format = { type: "json_object" };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${provider.apiKey}`,
    "Content-Type": "application/json",
  };
  if (provider.name === "openrouter") {
    // Optional attribution headers recommended by OpenRouter.
    headers["HTTP-Referer"] = process.env.FRONTEND_URL || "http://localhost:5173";
    headers["X-Title"] = "TawjihIQ";
  }

  const res = await fetch(provider.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, detail: await res.text() };
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { ok: false, status: 502, detail: `${provider.name} returned an empty response.` };
  }
  return { ok: true, content };
}

/** Call the model and return the raw assistant text, with retries + fallbacks. */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const providers = getProviders();
  let lastError = "";

  // Make up to 2 passes across every provider/model. On the first pass we move
  // on quickly when a model fails so we can try another provider instead of
  // blocking. If everything is busy, we wait briefly and try once more.
  for (let pass = 0; pass < 2; pass++) {
    for (const provider of providers) {
      for (const m of provider.models) {
        const result = await callModel(provider, m, messages, options);
        if (result.ok) {
          return result.content;
        }
        lastError = `${provider.name} request failed (${result.status}) [${m}]: ${result.detail}`;
        console.warn(`[AI] ${lastError}`);
        // 429 / 5xx -> try the next model/provider immediately.
        // 400 / 401 / 404 -> this model is unusable, also skip to the next.
      }
    }
    // Everything was busy this pass; brief pause before the final retry.
    if (pass === 0) await sleep(2000);
  }

  throw new Error(lastError || "AI request failed.");
}

/**
 * Call the model expecting JSON output, then parse it.
 * Strips markdown code fences if the model wraps the JSON.
 */
export async function chatJSON<T>(
  messages: ChatMessage[],
  temperature = 0.7
): Promise<T> {
  const raw = await chat(messages, { json: true, temperature });
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fallback: extract the first {...} or [...] block.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error("Failed to parse JSON from AI response.");
  }
}
