import OpenAI from "openai";
import { z } from "zod";

import type {
  LLMClient,
  LLMMessage,
  LLMStructuredRequest,
  LLMStructuredResponse,
  LLMTextRequest,
  LLMTextResponse,
} from "~/agents/llm/LLMClient";

function toOpenAIMessages(messages: LLMMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function extractJsonObject(text: string): string {
  // Prefer fenced ```json blocks if present.
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // Otherwise, try to take substring between first '{' and last '}'
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1).trim();

  return text.trim();
}

export interface OpenAILLMClientOptions {
  apiKey: string;
  defaultModel?: string;
}

/**
 * Concrete `LLMClient` implementation backed by the official `openai` npm package.
 */
export class OpenAILLMClient implements LLMClient {
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor(options: OpenAILLMClientOptions) {
    this.client = new OpenAI({ apiKey: options.apiKey });
    this.defaultModel = options.defaultModel ?? "gpt-4o-mini";
  }

  async generateText(request: LLMTextRequest): Promise<LLMTextResponse> {
    const model = request.model ?? this.defaultModel;

    const res = await this.client.chat.completions.create({
      model,
      messages: toOpenAIMessages(request.messages),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    });

    const text = res.choices[0]?.message?.content ?? "";
    return { text };
  }

  async generateStructured<T>(
    request: LLMStructuredRequest<T>,
  ): Promise<LLMStructuredResponse<T>> {
    const model = request.model ?? this.defaultModel;

    // We do not rely on a specific OpenAI "response_format" feature here, to keep it
    // compatible across models and future SDK changes.
    const systemPreamble =
      "You are a service that returns STRICT JSON only. Do not include markdown, code fences, or extra text.";

    const userSchemaHint = `Return a JSON object that validates against this Zod-described schema:\n${JSON.stringify(
      zodToJsonSchemaBestEffort(request.schema),
      null,
      2,
    )}`;

    const res = await this.client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPreamble },
        ...toOpenAIMessages(request.messages),
        { role: "user", content: userSchemaHint },
      ],
      temperature: request.temperature,
      max_tokens: request.maxTokens,
    });

    const rawText = res.choices[0]?.message?.content ?? "";
    const jsonText = extractJsonObject(rawText);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch (err) {
      throw new Error(
        `OpenAI returned non-JSON output. JSON.parse failed. Raw: ${rawText.slice(0, 500)}`,
      );
    }

    const parsed = request.schema.parse(parsedJson);
    return { rawText, parsed };
  }
}

/**
 * Best-effort JSON schema-ish representation for prompt assistance.
 * This avoids adding a dependency like zod-to-json-schema just for prompting.
 */
function zodToJsonSchemaBestEffort(schema: z.ZodTypeAny): unknown {
  // Zod has an internal _def shape; we intentionally keep this lightweight.
  // If this is not an object schema, just return a generic placeholder.
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    for (const key of Object.keys(shape)) {
      properties[key] = zodTypeName((shape as any)[key]);
    }
    return { type: "object", properties };
  }

  return { type: zodTypeName(schema) };
}

function zodTypeName(schema: z.ZodTypeAny): string {
  const typeName = (schema as any)?._def?.typeName as string | undefined;
  return typeName ?? "unknown";
}
