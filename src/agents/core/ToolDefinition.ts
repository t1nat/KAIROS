import { z } from "zod";

import { db } from "~/server/db";

// Reusable database client type for tools and agents
export type DbClient = typeof db;

/**
 * Minimal context passed to each tool execution.
 *
 * Tools should not depend on the full AgentContext to stay decoupled from
 * agent-specific concerns (LLM, logging, run id, etc.). They only receive
 * what they need to perform domain operations safely.
 */
export interface ToolCallContext {
  /** Drizzle ORM client bound to the current request / session. */
  db: DbClient;

  /**
   * Authenticated user id making the call. Tools must enforce permissions
   * using this id, mirroring the checks performed in tRPC routers.
   */
  sessionUserId: string;
}

/**
 * Generic, type-safe definition for an agent tool.
 *
 * Tools encapsulate concrete domain capabilities (projects, tasks, events...)
 * behind a constrained, well-documented interface so that agents can call
 * them without needing to know implementation details.
 */
export interface ToolDefinition<TArgs, TResult> {
  /** Unique, stable name for referencing this tool from agents. */
  name: string;

  /** Human-readable description of what the tool does and when to use it. */
  description: string;

  /** zod schema for validating and parsing tool input. */
  inputSchema: z.ZodTypeAny;

  /**
   * Execute the tool with validated args.
   *
   * This must be side-effect free unless explicitly designed otherwise
   * (e.g. task creation). All permission checks should live here, reusing
   * the same rules as the corresponding tRPC routers.
   */
  execute: (ctx: ToolCallContext, args: TArgs) => Promise<TResult>;
}

/**
 * Simple registry mapping tool names to their implementations.
 *
 * Higher-level code (AgentContext / AgentRunner) can expose a subset of
 * tools to a given agent by passing a tailored registry instance.
 */
export type ToolRegistry = Record<string, ToolDefinition<any, any>>;
