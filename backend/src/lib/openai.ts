// AI chat-completions client (OpenAI only).

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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

type OpenAIProvider = {
  apiKey: string;
  model: string;
};

function getOpenAIProvider(): OpenAIProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required in backend/.env.");
  }

  const model = process.env.OPENAI_MODEL?.trim() || OPENAI_DEFAULT_MODEL;
  return { apiKey, model };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callModel(
  provider: OpenAIProvider,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<{ ok: true; content: string } | { ok: false; status: number; detail: string }> {
  const body: Record<string, unknown> = {
    model: provider.model,
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

  const res = await fetch(OPENAI_URL, {
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
    return { ok: false, status: 502, detail: "OpenAI returned an empty response." };
  }
  return { ok: true, content };
}

/** Call OpenAI and return the raw assistant text, with one retry for transient failures. */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const provider = getOpenAIProvider();
  let lastError = "";

  // Make up to 2 attempts in case of transient provider errors.
  for (let pass = 0; pass < 2; pass++) {
    const result = await callModel(provider, messages, options);
    if (result.ok) {
      return result.content;
    }
    lastError = `openai request failed (${result.status}) [${provider.model}]: ${result.detail}`;
    console.warn(`[AI] ${lastError}`);
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