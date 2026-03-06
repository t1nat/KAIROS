/**
 * Schemas for the task generation feature of the agent system.
 */
import { z } from "zod";

export const GeneratedTaskSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(2000).default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  orderIndex: z.number().int().min(0).default(0),
  estimatedDueDays: z.number().int().min(0).nullable().default(null),
});

export const TaskGenerationOutputSchema = z.object({
  tasks: z.array(GeneratedTaskSchema).min(1).max(20),
  reasoning: z.string().default(""),
});

export type GeneratedTask = z.infer<typeof GeneratedTaskSchema>;
export type TaskGenerationOutput = z.infer<typeof TaskGenerationOutputSchema>;

/**
 * Input for the agent.generateTaskDrafts procedure.
 */
export const GenerateTaskDraftsInputSchema = z.object({
  projectId: z.number().int().positive(),
  /** Optional extra message/instructions from the user */
  message: z.string().max(5000).optional(),
});

export type GenerateTaskDraftsInput = z.infer<typeof GenerateTaskDraftsInputSchema>;

/**
 * Output for the agent.generateTaskDrafts procedure.
 */
export const GenerateTaskDraftsOutputSchema = z.object({
  draftId: z.string(),
  tasks: z.array(GeneratedTaskSchema),
  reasoning: z.string(),
  projectTitle: z.string(),
  projectDescription: z.string(),
});

export type GenerateTaskDraftsOutput = z.infer<typeof GenerateTaskDraftsOutputSchema>;

/**
 * Input for the agent.extractTasksFromPdf procedure.
 */
export const ExtractTasksFromPdfInputSchema = z.object({
  projectId: z.number().int().positive(),
  /** Base64-encoded PDF file content */
  pdfBase64: z.string().min(1),
  /** Original file name (for context) */
  fileName: z.string().max(256).optional(),
  /** Optional extra message/instructions from the user */
  message: z.string().max(5000).optional(),
});

export type ExtractTasksFromPdfInput = z.infer<typeof ExtractTasksFromPdfInputSchema>;
