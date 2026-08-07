// OpenRouter API Configuration — keys are stored server-side only
export const API_URL = "https://openrouter.ai/api/v1/chat/completions"; // kept for reference only

// Default model
export const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

// Model used for internal tasks (title + suggestions generation).
// Must be a non-reasoning instruction-tuned model that outputs clean JSON.
export const SUGGESTIONS_MODEL = "google/gemma-4-31b-it:free";

// Available models grouped by tier
export const AVAILABLE_MODELS = [
  // Premium – best quality
  { id: "openai/gpt-4o",                           name: "GPT-4o",             desc: "Vision · Elite",      tier: "premium" as const },
  { id: "anthropic/claude-sonnet-4.5",            name: "Claude Sonnet 4.5", desc: "Vision · Elite",      tier: "premium" as const },
  { id: "openai/o1",                               name: "o1",                 desc: "Advanced Reasoning",  tier: "premium" as const },
  // Fast – speed + value
  { id: "openai/gpt-4o-mini",                      name: "GPT-4o Mini",        desc: "Vision · Best Value", tier: "fast"    as const },
  { id: "anthropic/claude-haiku-4.5",              name: "Claude Haiku 4.5",   desc: "Vision · Fast",       tier: "fast"    as const },
  { id: "google/gemini-2.5-flash",                 name: "Gemini 2.5 Flash",   desc: "Fast · Smart",        tier: "fast"    as const },
  // Free – no cost (rate limited)
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free",   name: "Nemotron Ultra",    desc: "Free · Versatile",    tier: "free"    as const },
  { id: "cohere/north-mini-code:free",               name: "North Mini Code",   desc: "Free · Coding",       tier: "free"    as const },
  { id: "openai/gpt-oss-20b:free",                  name: "GPT-OSS 20B",       desc: "Free · Fast",         tier: "free"    as const },
  { id: "google/gemma-4-31b-it:free",               name: "Gemma 4 31B",       desc: "Free · Google",       tier: "free"    as const },
];

// Pexels — key stored server-side only