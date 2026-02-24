import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { agentOrchestrator } from "~/server/agents/orchestrator/agentOrchestrator";
import {
  GenerateTaskDraftsInputSchema,
  ExtractTasksFromPdfInputSchema,
} from "~/server/agents/schemas/taskGenerationSchemas";
import {
  TaskPlannerDraftInputSchema,
  TaskPlannerConfirmInputSchema,
  TaskPlannerApplyInputSchema,
} from "~/server/agents/schemas/a2TaskPlannerSchemas";
import {
  NotesVaultDraftInputSchema,
  NotesVaultConfirmInputSchema,
  NotesVaultApplyInputSchema,
} from "~/server/agents/schemas/a3NotesVaultSchemas";
import {
  EventsPublisherDraftInputSchema,
  EventsPublisherConfirmInputSchema,
  EventsPublisherApplyInputSchema,
} from "~/server/agents/schemas/a4EventsPublisherSchemas";

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
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.draft({
        ctx,
        agentId: input.agentId,
        message: input.message,
        scope: input.scope,
      });
    }),

  /**
   * A1 Project Chatbot — can run either project-scoped or workspace-scoped.
   * Used by the Project Intelligence UI with a project picker.
   */
  projectChatbot: protectedProcedure
    .input(
      z.object({
        projectId: z.number().optional(),
        message: z.string().min(1).max(20_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.draft({
        ctx,
        agentId: "workspace_concierge",
        message: input.message,
        scope: input.projectId ? { projectId: input.projectId } : undefined,
      });
    }),

  // -------------------------------------------------------------------------
  // A2 Task Planner
  // -------------------------------------------------------------------------

  taskPlannerDraft: protectedProcedure
    .input(TaskPlannerDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.taskPlannerDraft({
        ctx,
        message: input.message,
        scope: input.scope,
        handoffContext: input.handoffContext,
      });
    }),

  taskPlannerConfirm: protectedProcedure
    .input(TaskPlannerConfirmInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.taskPlannerConfirm({
        ctx,
        draftId: input.draftId,
      });
    }),

  taskPlannerApply: protectedProcedure
    .input(TaskPlannerApplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.taskPlannerApply({
        ctx,
        draftId: input.draftId,
        confirmationToken: input.confirmationToken,
      });
    }),

  // -------------------------------------------------------------------------
  // A3 Notes Vault
  // -------------------------------------------------------------------------

  notesVaultDraft: protectedProcedure
    .input(NotesVaultDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.notesVaultDraft({
        ctx,
        message: input.message,
        handoffContext: input.handoffContext,
      });
    }),

  notesVaultConfirm: protectedProcedure
    .input(NotesVaultConfirmInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.notesVaultConfirm({
        ctx,
        draftId: input.draftId,
      });
    }),

  notesVaultApply: protectedProcedure
    .input(NotesVaultApplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.notesVaultApply({
        ctx,
        draftId: input.draftId,
        confirmationToken: input.confirmationToken,
        handoffContext: input.handoffContext,
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

  // -------------------------------------------------------------------------
  // A4 Events Publisher
  // -------------------------------------------------------------------------

  eventsPublisherDraft: protectedProcedure
    .input(EventsPublisherDraftInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.eventsPublisherDraft({
        ctx,
        message: input.message,
        handoffContext: input.handoffContext,
      });
    }),

  eventsPublisherConfirm: protectedProcedure
    .input(EventsPublisherConfirmInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.eventsPublisherConfirm({
        ctx,
        draftId: input.draftId,
      });
    }),

  eventsPublisherApply: protectedProcedure
    .input(EventsPublisherApplyInputSchema)
    .mutation(async ({ ctx, input }) => {
      return agentOrchestrator.eventsPublisherApply({
        ctx,
        draftId: input.draftId,
        confirmationToken: input.confirmationToken,
      });
    }),
});
