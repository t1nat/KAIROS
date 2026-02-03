import type { User } from "~/server/db/schema";
import type { DbClient, ToolRegistry } from "./ToolDefinition";
import type { LLMClient } from "../llm/LLMClient";

export interface AgentEventPayload {
  type: string;
  [key: string]: unknown;
}

export interface AgentContext {
  db: DbClient;
  user: User;
  tools: ToolRegistry;
  llm: LLMClient;
  runId: number;
  log: (event: AgentEventPayload) => Promise<void>;
}
