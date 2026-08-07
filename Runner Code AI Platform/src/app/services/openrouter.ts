const BACKEND_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
import { apiFetch } from "../context/AuthContext";

import { AVAILABLE_MODELS, DEFAULT_MODEL } from "../config/api";

// Set of valid model IDs for fast lookup
const VALID_MODELS = new Set(AVAILABLE_MODELS.map(m => m.id));

export interface Message {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: {
      url: string;
    };
  }>;
}

export interface ChatCompletionOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  /** Extra system-prompt context appended to the default Runner Code prompt,
   *  used to inject Project Instructions when the chat belongs to a project. */
  projectInstructions?: string;
}

// Fallback models to try if primary fails (prioritize coding capability + reliability)
const FALLBACK_MODELS = [
  "openai/gpt-4o-mini",                      // Fast + vision + reliable
  "google/gemini-2.5-flash",                 // Fast + smart
  "nvidia/nemotron-3-ultra-550b-a55b:free",  // Free powerful fallback
  "openai/gpt-oss-20b:free",                 // Free fast fallback
  "google/gemma-4-31b-it:free",              // Free Google fallback
];

// Enhanced system prompt for coding excellence
const SYSTEM_PROMPT = `You are Runner Code AI, an elite AI assistant with exceptional expertise in:

🚀 **PRIMARY FOCUS - CODING & TECHNOLOGY:**
- Expert-level programming in ALL languages (JavaScript, TypeScript, Python, Java, C++, Go, Rust, etc.)
- Modern frameworks and libraries (React, Vue, Angular, Node.js, Django, Flask, Spring, etc.)
- Software architecture, design patterns, and best practices
- Algorithms, data structures, and performance optimization
- DevOps, CI/CD, Docker, Kubernetes, cloud platforms (AWS, Azure, GCP)
- Databases (SQL, NoSQL, Redis, MongoDB, PostgreSQL)
- API design (REST, GraphQL, WebSocket)
- Security best practices and code review
- Testing (unit, integration, E2E)
- Git, version control, and collaboration tools

🌟 **EXCELLENCE IN ALL DOMAINS:**
- Mathematics, physics, science
- Business, finance, and analytics
- Creative writing and content creation
- General knowledge and problem-solving

💡 **YOUR CODING PRINCIPLES:**
1. Write PRODUCTION-QUALITY code with proper error handling
2. Follow industry best practices and clean code principles
3. Provide detailed explanations with code examples
4. Debug issues systematically with clear reasoning
5. Optimize for performance, readability, and maintainability
6. Include comments and documentation
7. Suggest improvements and alternatives
8. Stay updated with latest tech trends

📝 **RESPONSE STYLE:**
- Clear, professional, and comprehensive
- Code blocks with proper syntax highlighting
- Step-by-step explanations for complex topics
- Real-world examples and best practices
- Proactive suggestions for improvements

You can answer in English or Arabic based on user's language. Be precise, thorough, and exceptionally helpful.`;

// Extra directive appended to the system prompt when the user enables "Adaptive thinking".
// Makes the model reason step-by-step before answering — better for complex tasks, slightly slower.
const ADAPTIVE_THINKING_DIRECTIVE = `

🧠 **ADAPTIVE THINKING MODE — ENABLED:**
Before giving your final answer, take a moment to reason through the problem internally:
1. Break the problem into smaller parts.
2. Consider edge cases, constraints, and trade-offs.
3. Verify your reasoning is sound before responding.
4. For complex questions, briefly outline your approach in a short "Plan" section, then deliver a complete, well-structured answer.
5. For simple questions, answer directly without unnecessary preamble.
Prioritize correctness and depth over speed.`;

export async function sendMessage(
  options: ChatCompletionOptions,
  onChunk?: (text: string) => void,
  retryCount: number = 0,
  continuationCount: number = 0
): Promise<string> {
  // Validate model — fall back to default if model ID no longer exists
  const requestedModel = retryCount === 0 ? options.model : FALLBACK_MODELS[Math.min(retryCount - 1, FALLBACK_MODELS.length - 1)];
  const currentModel = VALID_MODELS.has(requestedModel) || retryCount > 0 ? requestedModel : DEFAULT_MODEL;
  
  // Add system prompt if not already present (and not an internal AI analysis request)
  const messages = [...options.messages];
  const isInternalRequest = messages.some(m => 
    typeof m.content === 'string' && 
    (m.content.includes('Return ONLY') || m.content.includes('Answer with ONLY') || m.content.includes('Reply with ONLY'))
  );
  
  if (!isInternalRequest && !messages.some(m => m.role === 'system')) {
    const adaptive = (() => {
      try { return localStorage.getItem("runner-code:adaptive-thinking") === "1"; } catch { return false; }
    })();
    let systemContent = adaptive ? SYSTEM_PROMPT + ADAPTIVE_THINKING_DIRECTIVE : SYSTEM_PROMPT;
    const projInstr = options.projectInstructions?.trim();
    if (projInstr) {
      systemContent += `\n\n--- PROJECT INSTRUCTIONS ---\nThe user has opened this conversation inside a Project. Follow these project-specific instructions carefully, in addition to your general guidelines above. When they conflict with the user's request, the user's request still wins.\n\n${projInstr}\n--- END PROJECT INSTRUCTIONS ---`;
    }
    messages.unshift({ role: 'system', content: systemContent });
  }

  try {
    const response = await apiFetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: currentModel,
        messages: messages,
        temperature: options.temperature || 0.3,
        max_tokens: options.max_tokens || 8192, // Max output — models self-cap if lower
        stream: options.stream !== false,
      }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to send message";
      try {
        const error = await response.json();
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      // Try fallback models if needed
      if (errorMessage.includes("Provider returned error") || errorMessage.includes("provider") || errorMessage.includes("No endpoints found") || errorMessage.includes("404")) {
        // Try fallback model automatically
        if (retryCount < 2) {
          return await sendMessage(options, onChunk, retryCount + 1);
        }
        
        if (errorMessage.includes("No endpoints found")) {
          errorMessage = "Model not available. Please try a different model or check OpenRouter status.";
        } else {
          errorMessage = "All models are temporarily unavailable. Please try again in a few moments.";
        }
      }
      
      throw new Error(errorMessage);
    }

    if (options.stream && onChunk) {
      const reader = response.body?.getReader();
      // stream: true tells the decoder to hold incomplete multi-byte chars across reads
      const decoder = new TextDecoder("utf-8", { fatal: false });
      let fullText = "";
      let lastFinishReason: string | null = null;
      // Buffer holds any incomplete SSE line that was split across two network reads
      let lineBuffer = "";

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // {stream: true} preserves incomplete UTF-8 multi-byte sequences
            lineBuffer += decoder.decode(value, { stream: true });

            // Split on newlines but keep the last (potentially incomplete) segment in buffer
            const lines = lineBuffer.split("\n");
            lineBuffer = lines.pop() ?? ""; // last element may be incomplete

            for (const line of lines) {
              const trimmed = line.trimEnd();
              if (!trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6).trim();
              if (data === "[DONE]" || !data) continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                const finishReason = parsed.choices?.[0]?.finish_reason;
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
                if (finishReason) {
                  lastFinishReason = finishReason;
                }
              } catch {
                // genuinely malformed JSON — skip
              }
            }
          }

          // Flush any remaining bytes in the decoder
          const remaining = decoder.decode();
          if (remaining) {
            lineBuffer += remaining;
          }

          // Process any last complete line left in the buffer
          if (lineBuffer.startsWith("data: ")) {
            const data = lineBuffer.slice(6).trim();
            if (data && data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                const finishReason = parsed.choices?.[0]?.finish_reason;
                if (content) {
                  fullText += content;
                  onChunk(content);
                }
                if (finishReason) {
                  lastFinishReason = finishReason;
                }
              } catch {
                // incomplete final chunk — ignore
              }
            }
          }
        } catch (streamError) {
          // Return whatever was streamed so far when user stops generation
          if (streamError instanceof Error && streamError.name === 'AbortError') {
            return fullText;
          }
          throw streamError;
        }
      }

      // Auto-continuation: if model hit token limit, seamlessly continue the response
      // Max 3 continuations to prevent infinite loops (~32K tokens total)
      if (
        lastFinishReason === "length" &&
        continuationCount < 3 &&
        !options.signal?.aborted &&
        fullText.trim().length > 0
      ) {
        const continuationMessages: typeof messages = [
          ...messages,
          { role: "assistant" as const, content: fullText },
          { role: "user" as const, content: "Continue exactly from where you left off. Do not repeat anything." },
        ];
        const continuation = await sendMessage(
          { ...options, messages: continuationMessages },
          onChunk,
          0,
          continuationCount + 1
        );
        return fullText + continuation;
      }

      return fullText;
    } else {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      return content;
    }
  } catch (error) {
    // Re-throw AbortError so caller can handle stop-generation gracefully
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while sending the message");
  }
}
