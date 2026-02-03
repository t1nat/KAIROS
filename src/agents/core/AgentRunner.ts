import { eq } from "drizzle-orm";

import type { AgentDefinition } from "./AgentDefinition";
import type { AgentContext, AgentEventPayload } from "./AgentContext";
import type { DbClient, ToolRegistry } from "./ToolDefinition";
import type { LLMClient } from "../llm/LLMClient";
import { agentRunEvents, agentRuns, users } from "~/server/db/schema";

export interface AgentRunnerDependencies {
  db: DbClient;
  llm: LLMClient;
  tools: ToolRegistry;
}

export interface RunAgentParams<TInput> {
  agent: AgentDefinition<any, any>;
  /** The authenticated user id that initiates the run. */
  sessionUserId: string;
  /** External input passed to the agent (validated by agent.inputSchema). */
  input: unknown;
}

export interface RunAgentResult<TResult> {
  runId: number;
  result: TResult;
}

function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (typeof v === "bigint") return v.toString();
    if (v instanceof Date) return v.toISOString();
    return v;
  });
}

export class AgentRunner {
  private readonly db: DbClient;
  private readonly llm: LLMClient;
  private readonly tools: ToolRegistry;

  constructor(deps: AgentRunnerDependencies) {
    this.db = deps.db;
    this.llm = deps.llm;
    this.tools = deps.tools;
  }

  async run<TInput, TResult>(params: RunAgentParams<TInput>): Promise<RunAgentResult<TResult>> {
    const { agent, sessionUserId, input } = params;

    // Load the full user record for AgentContext.user
    const [user] = await this.db.select().from(users).where(eq(users.id, sessionUserId));
    if (!user) {
      throw new Error("User not found");
    }

    // Create run record
    const [runRow] = await this.db
      .insert(agentRuns)
      .values({
        agentId: agent.id,
        userId: sessionUserId,
        status: "running",
      })
      .returning({ id: agentRuns.id });

    const runId = runRow!.id;

    const log = async (event: AgentEventPayload): Promise<void> => {
      await this.db.insert(agentRunEvents).values({
        runId,
        type: String(event.type),
        payload: safeJsonStringify(event),
      });
    };

    const ctx: AgentContext = {
      db: this.db,
      user,
      tools: this.tools,
      llm: this.llm,
      runId,
      log,
    };

    try {
      await log({ type: "agent-run:start", agentId: agent.id });

      const parsedInput = agent.inputSchema.parse(input);

      const result = (await agent.run(ctx, parsedInput)) as TResult;

      await this.db
        .update(agentRuns)
        .set({
          status: "succeeded",
          summary: (result as any)?.summary ?? null,
        })
        .where(eq(agentRuns.id, runId));

      await log({ type: "agent-run:succeeded", agentId: agent.id });

      return { runId, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";

      await this.db
        .update(agentRuns)
        .set({
          status: "failed",
          error: message,
        })
        .where(eq(agentRuns.id, runId));

      await log({ type: "agent-run:failed", agentId: agent.id, error: message });

      throw err;
    }
  }
}
