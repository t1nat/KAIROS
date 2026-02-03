import { z } from "zod";
import type { AgentInputBase, AgentResultBase } from "~/lib/agents/types";
import type { AgentContext } from "./AgentContext";

export type AgentId =
  | "project-planning";

export interface AgentDefinition<
  TInput = unknown,
  TResult extends AgentResultBase = AgentResultBase,
> {
  id: AgentId;
  name: string;
  description: string;
  /** zod schema for validating external input */
  inputSchema: z.ZodTypeAny;
  /** Main agent entrypoint */
  run: (ctx: AgentContext, input: TInput) => Promise<TResult>;
}
