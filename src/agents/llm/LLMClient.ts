import { z } from "zod";

/**
 * Minimal, framework-agnostic LLM abstraction for agents.
 *
 * The concrete implementation (e.g. OpenAI, Anthropic, local model) should
 * live in the server layer and be injected into the AgentContext.
 */

export type LLMRole = "system" | "user" | "assistant";

export interface LLMMessage {
  role: LLMRole;
  content: string;
}

export interface LLMTextRequest {
  /** Full conversation history, including system and user messages. */
  messages: LLMMessage[];
  /**
   * Temperature for sampling. 0 = deterministic, higher = more creative.
   * Defaults should be provided by the concrete implementation.
   */
  temperature?: number;
  /** Optional model hint; implementation may ignore this. */
  model?: string;
  /** Approximate max tokens for the response, if supported. */
  maxTokens?: number;
}

export interface LLMStructuredRequest<T> extends LLMTextRequest {
  /**
   * Zod schema describing the expected JSON structure of the response.
   *
   * Implementations should:
   * - Instruct the model to answer with pure JSON only.
   * - Parse the JSON and validate with this schema.
   * - Optionally retry on validation errors.
   */
  schema: z.ZodType<T>;
}

export interface LLMTextResponse {
  /** Raw text returned by the model. */
  text: string;
}

export interface LLMStructuredResponse<T> {
  /** Raw JSON-ish text returned by the model (before parsing). */
  rawText: string;
  /** Parsed and schema-validated object. */
  parsed: T;
}

export interface LLMClient {
  /**
   * Basic text completion API used for free-form generation.
   */
  generateText(request: LLMTextRequest): Promise<LLMTextResponse>;

  /**
   * Structured generation API that validates the response against a Zod schema.
   */
  generateStructured<T>(request: LLMStructuredRequest<T>): Promise<LLMStructuredResponse<T>>;
}
