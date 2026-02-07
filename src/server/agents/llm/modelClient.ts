/**
 * LLM Model Client — uses HuggingFace Inference Providers (OpenAI-compatible).
 *
 * No `openai` npm package required — uses raw `fetch` against the
 * OpenAI-compatible chat completions endpoint.
 *
 * Env vars (see docs/agent-env-vars.md):
 *   LLM_BASE_URL   — e.g. https://router.huggingface.co/v1
 *   LLM_API_KEY    — HuggingFace token with inference.serverless.write
 *   LLM_DEFAULT_MODEL — e.g. Qwen/Qwen2.5-7B-Instruct
 */

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------

function getBaseUrl(): string {
  return (
    process.env.LLM_BASE_URL ??
    "https://router.huggingface.co/v1"
  );
}

function getApiKey(): string {
  return (
    process.env.LLM_API_KEY ??
    ""
  );
}

function getDefaultModel(): string {
  return (
    process.env.LLM_DEFAULT_MODEL ??
    "Qwen/Qwen2.5-7B-Instruct"
  );
}

// ---------------------------------------------------------------------------
// Types for the OpenAI-compatible response
// ---------------------------------------------------------------------------

interface HFChatChoice {
  index: number;
  message: {
    role: string;
    content: string | null;
  };
  finish_reason: string | null;
}

interface HFChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface HFChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: HFChatChoice[];
  usage?: HFChatUsage;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ChatRequest {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** If true, request the model to return JSON (response_format: json_object) */
  jsonMode?: boolean;
}

export interface ChatResponse {
  content: string;
  finishReason: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Send a chat completion request to the HuggingFace OpenAI-compatible endpoint.
 */
export async function chatCompletion(req: ChatRequest): Promise<ChatResponse> {
  const baseUrl = getBaseUrl().replace(/\/+$/, "");
  const apiKey = getApiKey();
  const model = req.model ?? getDefaultModel();

  if (!apiKey) {
    throw new Error(
      "LLM_API_KEY is not set. Please add your HuggingFace token to .env",
    );
  }

  const body: Record<string, unknown> = {
    model,
    messages: req.messages,
    temperature: req.temperature ?? 0.2,
    max_tokens: req.maxTokens ?? 4096,
  };

  if (req.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LLM request failed (${String(res.status)}): ${text.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as HFChatCompletionResponse;
  const choice = data.choices[0];

  if (!choice) {
    throw new Error("LLM returned no choices");
  }

  return {
    content: choice.message.content ?? "",
    finishReason: choice.finish_reason,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Send a simple prompt and get a string response.
 */
export async function simpleCompletion(
  systemPrompt: string,
  userMessage: string,
  opts?: { model?: string; temperature?: number; jsonMode?: boolean },
): Promise<string> {
  const res = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    model: opts?.model,
    temperature: opts?.temperature,
    jsonMode: opts?.jsonMode,
  });
  return res.content;
}
