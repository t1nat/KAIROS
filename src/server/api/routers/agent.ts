import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { agentOrchestrator } from "~/server/agents/orchestrator/agentOrchestrator";
import {
  GenerateTaskDraftsInputSchema,
  ExtractTasksFromPdfInputSchema,
} from "~/server/agents/schemas/taskGenerationSchemas";

export const agentRouter = createTRPCRouter({
  /**
   * General A1 draft — workspace concierge answers questions with LLM.
   */
  draft: protectedProcedure
    .input(
      z.object({
        agentId: z.literal("workspace_concierge"),
        message: z.string().min(1).max(20_000),
        scope: z
          .object({
            orgId: z.union([z.string(), z.number()]).optional(),
            projectId: z.union([z.string(), z.number()]).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }: any) => {
      return agentOrchestrator.draft({
        ctx,
        agentId: input.agentId,
        message: input.message,
        scope: input.scope,
      });
    }),

  /**
   * Generate task drafts from a project's description.
   * The agent analyzes the project description and existing tasks
   * to produce intelligent, non-duplicate task suggestions.
   */
  generateTaskDrafts: protectedProcedure
    .input(GenerateTaskDraftsInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.generateTaskDrafts({
        ctx,
        projectId: input.projectId,
        message: input.message,
      });
    }),

  /**
   * Extract tasks from an uploaded PDF document.
   * Supports documents in EN, BG, ES, DE, FR.
   */
  extractTasksFromPdf: protectedProcedure
    .input(ExtractTasksFromPdfInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.extractTasksFromPdf({
        ctx,
        projectId: input.projectId,
        pdfBase64: input.pdfBase64,
        fileName: input.fileName,
        message: input.message,
      });
    }),
});
