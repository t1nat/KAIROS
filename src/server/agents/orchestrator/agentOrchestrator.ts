import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";

import type { TRPCContext } from "~/server/api/trpc";
import { a1WorkspaceConciergeProfile } from "~/server/agents/profiles/a1WorkspaceConcierge";
import {
  A1OutputSchema,
  type A1Output,
} from "~/server/agents/schemas/a1WorkspaceConciergeSchemas";
import {
  TaskGenerationOutputSchema,
  type GenerateTaskDraftsOutput,
} from "~/server/agents/schemas/taskGenerationSchemas";
import { A1_READ_TOOLS } from "~/server/agents/tools/a1/readTools";
import { buildA1Context } from "~/server/agents/context/a1ContextBuilder";
import {
  getA1SystemPrompt,
  getTaskGenerationPrompt,
  getPdfTaskExtractionPrompt,
} from "~/server/agents/prompts/a1Prompts";
import { chatCompletion } from "~/server/agents/llm/modelClient";
import { parseAndValidate } from "~/server/agents/llm/jsonRepair";
import { extractTextFromPdf } from "~/server/agents/pdf/pdfExtractor";
import { projects, tasks, projectCollaborators, users } from "~/server/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentId = "workspace_concierge";

export interface AgentDraftInput {
  ctx: TRPCContext;
  agentId: AgentId;
  message: string;
  scope?: {
    orgId?: string | number;
    projectId?: string | number;
  };
}

export interface AgentDraftResult {
  draftId: string;
  outputJson: A1Output;
}

export interface TaskDraftInput {
  ctx: TRPCContext;
  projectId: number;
  message?: string;
}

export interface PdfTaskInput {
  ctx: TRPCContext;
  projectId: number;
  pdfBase64: string;
  fileName?: string;
  message?: string;
}

function createDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export const agentOrchestrator = {
  /**
   * General A1 draft — answers workspace questions with LLM.
   */
  async draft(input: AgentDraftInput): Promise<AgentDraftResult> {
    const profile =
      input.agentId === "workspace_concierge"
        ? a1WorkspaceConciergeProfile
        : null;

    if (!profile) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown agentId: ${input.agentId}`,
      });
    }

    const draftId = createDraftId();

    // 1. Build context pack from DB (read-only tools)
    const contextPack = await buildA1Context(input.ctx, input.scope);

    // 2. Build system prompt with full workspace context
    const systemPrompt = getA1SystemPrompt(contextPack);

    // 3. Call LLM
    let outputJson: A1Output;
    try {
      const llmResponse = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.message },
        ],
        temperature: 0.2,
        jsonMode: true,
      });

      // 4. Parse + validate with repair loop
      const parseResult = await parseAndValidate(llmResponse.content, A1OutputSchema);

      if (!parseResult.success) {
        // Fallback: return a structured error as a valid A1Output
        const safeScope = input.scope ?? {};
        outputJson = {
          intent: { type: "answer" as const, scope: { orgId: safeScope.orgId, projectId: safeScope.projectId } },
          answer: {
            summary: "I encountered an error processing your request. Please try rephrasing.",
            details: [parseResult.error],
          },
        };
      } else {
        outputJson = parseResult.data;
      }
    } catch (err) {
      // LLM call failed — return a safe fallback using context pack
      const contextFallback = await buildFallbackResponse(contextPack, input);
      outputJson = contextFallback;
    }

    return { draftId, outputJson };
  },

  /**
   * Generate task drafts from a project description using the LLM.
   * This is the "description-aware" feature — the agent analyzes the project
   * description to produce intelligent task suggestions.
   */
  async generateTaskDrafts(input: TaskDraftInput): Promise<GenerateTaskDraftsOutput> {
    const userId = input.ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // 1. Fetch project details
    const [project] = await input.ctx.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        createdById: projects.createdById,
      })
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1);

    if (!project) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Project not found",
      });
    }

    // 2. Authorization check — user must be creator or collaborator
    if (project.createdById !== userId) {
      const [collab] = await input.ctx.db
        .select({ collaboratorId: projectCollaborators.collaboratorId })
        .from(projectCollaborators)
        .where(eq(projectCollaborators.projectId, input.projectId))
        .limit(1);

      if (!collab || collab.collaboratorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        });
      }
    }

    // 3. Fetch existing tasks to avoid duplication
    const existingTasks = await input.ctx.db
      .select({
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(eq(tasks.projectId, input.projectId))
      .orderBy(desc(tasks.createdAt))
      .limit(50);

    // 4. Fetch available team members
    const collaborators = await input.ctx.db
      .select({
        id: users.id,
        name: users.name,
      })
      .from(projectCollaborators)
      .innerJoin(users, eq(projectCollaborators.collaboratorId, users.id))
      .where(eq(projectCollaborators.projectId, input.projectId));

    // Include the project owner
    const [owner] = await input.ctx.db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, project.createdById))
      .limit(1);

    const availableUsers = [
      ...(owner ? [{ id: owner.id, name: owner.name }] : []),
      ...collaborators,
    ];

    // 5. Build the description-aware prompt
    const projectDescription = [
      project.description ?? "",
      input.message ? `\n\nAdditional instructions: ${input.message}` : "",
    ].join("");

    if (!projectDescription.trim()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Project has no description and no additional instructions were provided. Please add a description to your project first.",
      });
    }

    const systemPrompt = getTaskGenerationPrompt({
      projectTitle: project.title,
      projectDescription,
      existingTasks,
      availableUsers,
    });

    // 6. Call LLM
    const draftId = createDraftId();

    try {
      const llmResponse = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              input.message ??
              `Analyze the project description and generate a comprehensive task breakdown for "${project.title}".`,
          },
        ],
        temperature: 0.3,
        jsonMode: true,
        maxTokens: 4096,
      });

      // 7. Parse + validate
      const parseResult = await parseAndValidate(
        llmResponse.content,
        TaskGenerationOutputSchema,
      );

      if (!parseResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to parse task generation output: ${parseResult.error}`,
        });
      }

      return {
        draftId,
        tasks: parseResult.data.tasks.map((t) => ({
          title: t.title,
          description: t.description ?? "",
          priority: t.priority ?? "medium",
          orderIndex: t.orderIndex ?? 0,
          estimatedDueDays: t.estimatedDueDays ?? null,
        })),
        reasoning: parseResult.data.reasoning ?? "",
        projectTitle: project.title,
        projectDescription: project.description ?? "",
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          err instanceof Error
            ? `Agent error: ${err.message}`
            : "An unexpected error occurred while generating tasks",
      });
    }
  },

  /**
   * Extract tasks from a PDF document using the LLM.
   * Supports documents in EN, BG, ES, DE, FR (matching i18n config).
   */
  async extractTasksFromPdf(input: PdfTaskInput): Promise<GenerateTaskDraftsOutput> {
    const userId = input.ctx.session?.user?.id;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // 1. Fetch project details
    const [project] = await input.ctx.db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        createdById: projects.createdById,
      })
      .from(projects)
      .where(eq(projects.id, input.projectId))
      .limit(1);

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
    }

    // 2. Authorization check
    if (project.createdById !== userId) {
      const [collab] = await input.ctx.db
        .select({ collaboratorId: projectCollaborators.collaboratorId })
        .from(projectCollaborators)
        .where(eq(projectCollaborators.projectId, input.projectId))
        .limit(1);

      if (!collab || collab.collaboratorId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this project",
        });
      }
    }

    // 3. Extract text from PDF
    let pdfResult: Awaited<ReturnType<typeof extractTextFromPdf>>;
    try {
      pdfResult = await extractTextFromPdf(input.pdfBase64);
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          err instanceof Error
            ? err.message
            : "Failed to extract text from the PDF",
      });
    }

    // 4. Fetch existing tasks to avoid duplication
    const existingTasks = await input.ctx.db
      .select({
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
      })
      .from(tasks)
      .where(eq(tasks.projectId, input.projectId))
      .orderBy(desc(tasks.createdAt))
      .limit(50);

    // 5. Build the PDF-aware prompt
    const systemPrompt = getPdfTaskExtractionPrompt({
      projectTitle: project.title,
      projectDescription: project.description ?? "",
      pdfText: pdfResult.text,
      pdfFileName: input.fileName,
      pdfTruncated: pdfResult.truncated,
      pdfPageCount: pdfResult.numPages,
      existingTasks,
      userMessage: input.message,
    });

    // 6. Call LLM
    const draftId = createDraftId();

    try {
      const llmResponse = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content:
              input.message ??
              `Extract actionable tasks from this PDF document for the project "${project.title}".`,
          },
        ],
        temperature: 0.3,
        jsonMode: true,
        maxTokens: 4096,
      });

      // 7. Parse + validate
      const parseResult = await parseAndValidate(
        llmResponse.content,
        TaskGenerationOutputSchema,
      );

      if (!parseResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to parse PDF task extraction output: ${parseResult.error}`,
        });
      }

      return {
        draftId,
        tasks: parseResult.data.tasks.map((t) => ({
          title: t.title,
          description: t.description ?? "",
          priority: t.priority ?? "medium",
          orderIndex: t.orderIndex ?? 0,
          estimatedDueDays: t.estimatedDueDays ?? null,
        })),
        reasoning: parseResult.data.reasoning ?? "",
        projectTitle: project.title,
        projectDescription: project.description ?? "",
      };
    } catch (err) {
      if (err instanceof TRPCError) throw err;

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          err instanceof Error
            ? `Agent error: ${err.message}`
            : "An unexpected error occurred while extracting tasks from the PDF",
      });
    }
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildFallbackResponse(
  context: Awaited<ReturnType<typeof buildA1Context>>,
  input: AgentDraftInput,
): Promise<A1Output> {
  void input;
  const unreadNotifications = context.notifications.filter((n) => !n.read).length;
  const projectCount = context.projects.length;
  const taskSummary =
    context.tasks.length > 0
      ? `You have ${context.tasks.length} tasks in the current project scope.`
      : "";

  const safeScope = input.scope ?? {};
  return {
    intent: { type: "answer" as const, scope: { orgId: safeScope.orgId, projectId: safeScope.projectId } },
    answer: {
      summary: `Here's a quick overview of your workspace: ${projectCount} project(s), ${unreadNotifications} unread notification(s). ${taskSummary} (Note: The AI assistant is currently unavailable — this is a pre-built summary from your workspace data.)`,
      details: [
        `Projects: ${context.projects.map((p) => p.title).join(", ") || "none"}`,
        `Unread notifications: ${unreadNotifications}`,
      ],
    },
    citations: [{ label: "fallback", ref: "context_pack" }],
  };
}
