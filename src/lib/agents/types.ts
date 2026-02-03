import { z } from "zod";

// Shared enums / status values for agent runs
export const AgentRunStatusEnum = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export type AgentRunStatus = z.infer<typeof AgentRunStatusEnum>;

// Base shapes for all agents
export interface AgentRunSummary {
  id: number;
  agentId: string;
  status: AgentRunStatus;
  createdAt: string;
  updatedAt: string;
  summary?: string | null;
  error?: string | null;
}

export interface AgentEventDto {
  id: number;
  runId: number;
  type: string;
  payload: unknown;
  createdAt: string;
}

export interface AgentResultBase {
  summary: string;
}

export type AgentInputBase = unknown;

// Project Planning Agent specific DTOs
export const PlannedTaskSuggestionSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(2000).optional(),
  orderIndex: z.number().int().nonnegative(),
  suggestedDueDate: z.string().datetime().optional(),
  suggestedAssigneeId: z.string().max(255).nullable().optional(),
});

export type PlannedTaskSuggestion = z.infer<typeof PlannedTaskSuggestionSchema>;

export interface ProjectPlanningAgentResult extends AgentResultBase {
  projectId: number;
  tasks: PlannedTaskSuggestion[];
  notes?: string;
}