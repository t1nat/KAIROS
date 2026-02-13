import { TRPCError } from "@trpc/server";
import crypto from "node:crypto";
import { eq, desc, and } from "drizzle-orm";

import type { TRPCContext } from "~/server/api/trpc";
import { a1WorkspaceConciergeProfile } from "~/server/agents/profiles/a1WorkspaceConcierge";
import { a2TaskPlannerProfile } from "~/server/agents/profiles/a2TaskPlanner";
import {
  A1OutputSchema,
  type A1Output,
} from "~/server/agents/schemas/a1WorkspaceConciergeSchemas";
import {
  TaskGenerationOutputSchema,
  type GenerateTaskDraftsOutput,
} from "~/server/agents/schemas/taskGenerationSchemas";
import {
  TaskPlanDraftSchema,
  type TaskPlanDraft,
} from "~/server/agents/schemas/a2TaskPlannerSchemas";
import {
  NotesVaultDraftSchema,
  type NotesVaultDraft,
  type NotesVaultApplyOutput,
} from "~/server/agents/schemas/a3NotesVaultSchemas";
import { A1_READ_TOOLS } from "~/server/agents/tools/a1/readTools";
import { buildA1Context } from "~/server/agents/context/a1ContextBuilder";
import { buildA2Context } from "~/server/agents/context/a2ContextBuilder";
import { buildA3Context } from "~/server/agents/context/a3ContextBuilder";
import {
  getA1SystemPrompt,
  getTaskGenerationPrompt,
  getPdfTaskExtractionPrompt,
} from "~/server/agents/prompts/a1Prompts";
import { getA2SystemPrompt } from "~/server/agents/prompts/a2Prompts";
import { getA3SystemPrompt } from "~/server/agents/prompts/a3Prompts";
import { chatCompletion } from "~/server/agents/llm/modelClient";
import { parseAndValidate } from "~/server/agents/llm/jsonRepair";
import { extractTextFromPdf } from "~/server/agents/pdf/pdfExtractor";
import {
  projects,
  tasks,
  projectCollaborators,
  users,
  stickyNotes,
  agentNotesVaultDrafts,
  agentNotesVaultApplies,
  agentTaskPlannerDrafts,
  agentTaskPlannerApplies,
} from "~/server/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AgentId = "workspace_concierge" | "task_planner" | "notes_vault";

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
  outputJson: A1Output | TaskPlanDraft | NotesVaultDraft;
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

function requireUserId(ctx: TRPCContext): string {
  const userId = ctx.session?.user?.id;
  if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });
  return userId;
}

function requireProjectId(scope?: { projectId?: string | number }): number {
  const pid = scope?.projectId;
  if (typeof pid === "number") return pid;
  throw new TRPCError({ code: "BAD_REQUEST", message: "projectId is required" });
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(",")}}`;
}

function computePlanHash(plan: unknown): string {
  return crypto.createHash("sha256").update(stableJson(plan)).digest("hex");
}

type ConfirmationTokenPayload = {
  userId: string;
  draftId: string;
  planHash: string;
  expiresAt: number;
};

function mintConfirmationToken(payload: ConfirmationTokenPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function readConfirmationToken(token: string): ConfirmationTokenPayload {
  try {
    const raw = Buffer.from(token, "base64").toString("utf8");
    return JSON.parse(raw) as ConfirmationTokenPayload;
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid confirmation token" });
  }
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export const agentOrchestrator = {
  // ---------------------------------------------------------------------------
  // A3 Notes Vault API
  // ---------------------------------------------------------------------------

  async notesVaultDraft(input: {
    ctx: TRPCContext;
    message: string;
    handoffContext?: Record<string, unknown>;
  }): Promise<{ draftId: string; plan: NotesVaultDraft }> {
    const userId = requireUserId(input.ctx);
    const draftId = createDraftId();

    const contextPack = await buildA3Context({
      ctx: input.ctx,
      handoffContext: input.handoffContext,
    });

    const systemPrompt = getA3SystemPrompt(contextPack);

    const llmResponse = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.message },
      ],
      temperature: 0.2,
      jsonMode: true,
    });

    const parseResult = await parseAndValidate(llmResponse.content, NotesVaultDraftSchema);
    if (!parseResult.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid A3 plan JSON: ${parseResult.error}`,
      });
    }

    // Server-side guardrails: enforce requiresUnlocked for password-protected notes.
    const lockedIds = new Set(
      contextPack.notes.filter((n) => n.isLocked).map((n) => n.id),
    );

    const guardedPlan: NotesVaultDraft = {
      ...parseResult.data,
      operations: parseResult.data.operations.map((op) => {
        if (op.type !== "update") return op;
        const requiresUnlocked = lockedIds.has(op.noteId) ? true : op.requiresUnlocked;
        return { ...op, requiresUnlocked };
      }),
    };

    const planHash = computePlanHash(guardedPlan);
    const plan: NotesVaultDraft = { ...guardedPlan, planHash };

    await input.ctx.db.insert(agentNotesVaultDrafts).values({
      id: draftId,
      userId,
      message: input.message,
      planJson: JSON.stringify(plan),
      planHash,
      status: "draft",
    });

    return { draftId, plan };
  },

  async notesVaultConfirm(input: {
    ctx: TRPCContext;
    draftId: string;
  }): Promise<{ confirmationToken: string; summary: { creates: number; updates: number; deletes: number; blocked: number } }> {
    const userId = requireUserId(input.ctx);

    const [draft] = await input.ctx.db
      .select({
        id: agentNotesVaultDrafts.id,
        userId: agentNotesVaultDrafts.userId,
        planJson: agentNotesVaultDrafts.planJson,
        planHash: agentNotesVaultDrafts.planHash,
        status: agentNotesVaultDrafts.status,
        confirmationToken: agentNotesVaultDrafts.confirmationToken,
      })
      .from(agentNotesVaultDrafts)
      .where(eq(agentNotesVaultDrafts.id, input.draftId))
      .limit(1);

    if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
    if (draft.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
    if (draft.status === "confirmed") {
      // Idempotent confirm: allow the UI to recover if the user clicks Confirm twice.
      return {
        confirmationToken: draft.confirmationToken ?? mintConfirmationToken({
          userId,
          draftId: draft.id,
          planHash: draft.planHash,
          expiresAt: Date.now() + 10 * 60 * 1000,
        }),
        summary: {
          creates: 0,
          updates: 0,
          deletes: 0,
          blocked: 0,
        },
      };
    }

    if (draft.status !== "draft") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Draft is not confirmable (status=${draft.status})`,
      });
    }

    const plan = NotesVaultDraftSchema.parse(JSON.parse(draft.planJson) as unknown);

    const confirmationToken =
      draft.confirmationToken ??
      mintConfirmationToken({
        userId,
        draftId: draft.id,
        planHash: draft.planHash,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

    await input.ctx.db
      .update(agentNotesVaultDrafts)
      .set({
        status: "confirmed",
        confirmationToken,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentNotesVaultDrafts.id, draft.id));

    const creates = plan.operations.filter((o) => o.type === "create").length;
    const updates = plan.operations.filter((o) => o.type === "update").length;
    const deletes = plan.operations.filter((o) => o.type === "delete").length;

    return {
      confirmationToken,
      summary: {
        creates,
        updates,
        deletes,
        blocked: plan.blocked.length,
      },
    };
  },

  async notesVaultApply(input: {
    ctx: TRPCContext;
    draftId: string;
    confirmationToken: string;
    handoffContext?: Record<string, unknown>;
  }): Promise<NotesVaultApplyOutput> {
    const userId = requireUserId(input.ctx);

    const payload = readConfirmationToken(input.confirmationToken);
    if (payload.userId !== userId || payload.draftId !== input.draftId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Confirmation token does not match user/draft" });
    }
    if (Date.now() > payload.expiresAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmation token expired" });
    }

    const [draft] = await input.ctx.db
      .select({
        id: agentNotesVaultDrafts.id,
        userId: agentNotesVaultDrafts.userId,
        planJson: agentNotesVaultDrafts.planJson,
        planHash: agentNotesVaultDrafts.planHash,
        status: agentNotesVaultDrafts.status,
        confirmationToken: agentNotesVaultDrafts.confirmationToken,
      })
      .from(agentNotesVaultDrafts)
      .where(eq(agentNotesVaultDrafts.id, input.draftId))
      .limit(1);

    if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
    if (draft.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
    if (draft.status !== "confirmed") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Draft is not applicable (status=${draft.status})` });
    }
    if (draft.planHash !== payload.planHash) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Plan hash mismatch" });
    }
    if (draft.confirmationToken !== input.confirmationToken) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmation token mismatch" });
    }

    const plan = NotesVaultDraftSchema.parse(JSON.parse(draft.planJson) as unknown);

    // Apply-time guard: only allow locked-note updates/deletes if the plaintext is present in handoffContext.
    const contextPack = await buildA3Context({ ctx: input.ctx, handoffContext: input.handoffContext });
    const unlockedIds = new Set(
      contextPack.notes.filter((n) => n.isLocked && n.unlockedContent).map((n) => n.id),
    );

    const lockedIds = new Set(contextPack.notes.filter((n) => n.isLocked).map((n) => n.id));

    const createdNoteIds: number[] = [];
    const updatedNoteIds: number[] = [];
    const deletedNoteIds: number[] = [];
    const blockedNoteIds: number[] = [];

    for (const op of plan.operations) {
      if (op.type === "create") {
        const inserted = await input.ctx.db
          .insert(stickyNotes)
          .values({
            content: op.content,
            createdById: userId,
            shareStatus: "private",
          })
          .returning({ id: stickyNotes.id });
        if (inserted[0]?.id) createdNoteIds.push(inserted[0].id);
        continue;
      }

      if (op.type === "update") {
        if (op.requiresUnlocked && !unlockedIds.has(op.noteId)) {
          blockedNoteIds.push(op.noteId);
          continue;
        }

        await input.ctx.db
          .update(stickyNotes)
          .set({ content: op.nextContent })
          .where(and(eq(stickyNotes.id, op.noteId), eq(stickyNotes.createdById, userId)));
        updatedNoteIds.push(op.noteId);
        continue;
      }

      if (op.type === "delete") {
        if (!op.dangerous) {
          blockedNoteIds.push(op.noteId);
          continue;
        }

        // Require unlocked handoff content for locked note deletes.
        if (lockedIds.has(op.noteId) && !unlockedIds.has(op.noteId)) {
          blockedNoteIds.push(op.noteId);
          continue;
        }

        await input.ctx.db
          .delete(stickyNotes)
          .where(and(eq(stickyNotes.id, op.noteId), eq(stickyNotes.createdById, userId)));
        deletedNoteIds.push(op.noteId);
      }
    }

    await input.ctx.db
      .insert(agentNotesVaultApplies)
      .values({
        draftId: draft.id,
        userId,
        planHash: draft.planHash,
        resultJson: JSON.stringify({ createdNoteIds, updatedNoteIds, deletedNoteIds, blockedNoteIds }),
      });

    await input.ctx.db
      .update(agentNotesVaultDrafts)
      .set({ status: "applied", appliedAt: new Date(), updatedAt: new Date() })
      .where(eq(agentNotesVaultDrafts.id, draft.id));

    return {
      applied: true as const,
      results: { createdNoteIds, updatedNoteIds, deletedNoteIds, blockedNoteIds },
    };
  },

  // ---------------------------------------------------------------------------
  // A2 Task Planner API
  // ---------------------------------------------------------------------------

  async taskPlannerDraft(input: {
    ctx: TRPCContext;
    message: string;
    scope?: { orgId?: string | number; projectId?: number };
    handoffContext?: Record<string, unknown>;
  }): Promise<{ draftId: string; plan: TaskPlanDraft }> {
    const userId = requireUserId(input.ctx);
    if (!input.scope?.projectId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "projectId is required" });
    }

    const draftId = createDraftId();

    const contextPack = await buildA2Context({
      ctx: input.ctx,
      scope: { orgId: input.scope.orgId, projectId: input.scope.projectId },
      handoffContext: input.handoffContext,
    });

    const systemPrompt = getA2SystemPrompt(contextPack);

    const llmResponse = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.message },
      ],
      temperature: 0.2,
      jsonMode: true,
    });

    const parseResult = await parseAndValidate(llmResponse.content, TaskPlanDraftSchema);
    if (!parseResult.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid A2 plan JSON: ${parseResult.error}`,
      });
    }

    const planHash = computePlanHash(parseResult.data);
    const plan: TaskPlanDraft = { ...parseResult.data, planHash };

    await input.ctx.db.insert(agentTaskPlannerDrafts).values({
      id: draftId,
      userId,
      projectId: input.scope.projectId,
      message: input.message,
      planJson: JSON.stringify(plan),
      planHash,
      status: "draft",
    });

    return { draftId, plan };
  },

  async taskPlannerConfirm(input: {
    ctx: TRPCContext;
    draftId: string;
  }): Promise<{ confirmationToken: string; summary: { creates: number; updates: number; statusChanges: number; deletes: number } }> {
    const userId = requireUserId(input.ctx);

    const [draft] = await input.ctx.db
      .select({
        id: agentTaskPlannerDrafts.id,
        userId: agentTaskPlannerDrafts.userId,
        planJson: agentTaskPlannerDrafts.planJson,
        planHash: agentTaskPlannerDrafts.planHash,
        status: agentTaskPlannerDrafts.status,
      })
      .from(agentTaskPlannerDrafts)
      .where(eq(agentTaskPlannerDrafts.id, input.draftId))
      .limit(1);

    if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
    if (draft.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
    if (draft.status !== "draft") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Draft is not confirmable (status=${draft.status})` });
    }

    const plan = TaskPlanDraftSchema.parse(JSON.parse(draft.planJson) as unknown);
    const confirmationToken = mintConfirmationToken({
      userId,
      draftId: draft.id,
      planHash: draft.planHash,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    await input.ctx.db
      .update(agentTaskPlannerDrafts)
      .set({
        status: "confirmed",
        confirmationToken,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agentTaskPlannerDrafts.id, draft.id));

    return {
      confirmationToken,
      summary: {
        creates: plan.creates.length,
        updates: plan.updates.length,
        statusChanges: plan.statusChanges.length,
        deletes: plan.deletes.length,
      },
    };
  },

  async taskPlannerApply(input: {
    ctx: TRPCContext;
    draftId: string;
    confirmationToken: string;
  }): Promise<{ applied: true; results: { createdTaskIds: number[]; updatedTaskIds: number[]; statusChangedTaskIds: number[]; deletedTaskIds: number[] } }> {
    const userId = requireUserId(input.ctx);

    const payload = readConfirmationToken(input.confirmationToken);
    if (payload.userId !== userId || payload.draftId !== input.draftId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Confirmation token does not match user/draft" });
    }
    if (Date.now() > payload.expiresAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmation token expired" });
    }

    const [draft] = await input.ctx.db
      .select({
        id: agentTaskPlannerDrafts.id,
        userId: agentTaskPlannerDrafts.userId,
        projectId: agentTaskPlannerDrafts.projectId,
        planJson: agentTaskPlannerDrafts.planJson,
        planHash: agentTaskPlannerDrafts.planHash,
        status: agentTaskPlannerDrafts.status,
        confirmationToken: agentTaskPlannerDrafts.confirmationToken,
      })
      .from(agentTaskPlannerDrafts)
      .where(eq(agentTaskPlannerDrafts.id, input.draftId))
      .limit(1);

    if (!draft) throw new TRPCError({ code: "NOT_FOUND", message: "Draft not found" });
    if (draft.userId !== userId) throw new TRPCError({ code: "FORBIDDEN" });
    if (draft.status !== "confirmed") {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Draft is not applicable (status=${draft.status})` });
    }
    if (draft.planHash !== payload.planHash) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Plan hash mismatch" });
    }
    if (draft.confirmationToken !== input.confirmationToken) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmation token mismatch" });
    }

    const plan = TaskPlanDraftSchema.parse(JSON.parse(draft.planJson) as unknown);

    const createdTaskIds: number[] = [];
    const updatedTaskIds: number[] = [];
    const statusChangedTaskIds: number[] = [];
    const deletedTaskIds: number[] = [];

    // Apply creates with idempotency.
    for (const c of plan.creates) {
      // idempotency: if a task already exists with this clientRequestId, skip create.
      const existing = await input.ctx.db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.projectId, plan.scope.projectId), eq(tasks.clientRequestId, c.clientRequestId)))
        .limit(1);

      if (existing[0]?.id) {
        createdTaskIds.push(existing[0].id);
        continue;
      }

      const inserted = await input.ctx.db
        .insert(tasks)
        .values({
          title: c.title,
          description: c.description,
          projectId: plan.scope.projectId,
          priority: c.priority,
          assignedToId: c.assignedToId ?? null,
          dueDate: c.dueDate ? new Date(c.dueDate) : null,
          orderIndex: c.orderIndex ?? 0,
          createdById: userId,
          lastEditedById: userId,
          lastEditedAt: new Date(),
          clientRequestId: c.clientRequestId,
        })
        .returning({ id: tasks.id });

      if (inserted[0]?.id) createdTaskIds.push(inserted[0].id);
    }

    // Apply updates/status changes/deletes (best-effort). These operations are not idempotent via clientRequestId
    // right now; they rely on taskId.
    for (const u of plan.updates) {
      await input.ctx.db
        .update(tasks)
        .set({
          ...u.patch,
          assignedToId:
            "assignedToId" in u.patch
              ? (u.patch.assignedToId ?? null)
              : undefined,
          dueDate:
            "dueDate" in u.patch
              ? (u.patch.dueDate ? new Date(u.patch.dueDate) : null)
              : undefined,
          lastEditedById: userId,
          lastEditedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, u.taskId), eq(tasks.projectId, plan.scope.projectId)));
      updatedTaskIds.push(u.taskId);
    }

    for (const s of plan.statusChanges) {
      await input.ctx.db
        .update(tasks)
        .set({
          status: s.status,
          completedAt: s.status === "completed" ? new Date() : null,
          completedById: s.status === "completed" ? userId : null,
          // When a task is un-completed by the planner, clear any completion note.
          completionNote: s.status === "completed" ? undefined : null,
          lastEditedById: userId,
          lastEditedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(tasks.id, s.taskId), eq(tasks.projectId, plan.scope.projectId)));
      statusChangedTaskIds.push(s.taskId);
    }

    for (const d of plan.deletes) {
      if (!d.dangerous) continue;
      await input.ctx.db
        .delete(tasks)
        .where(and(eq(tasks.id, d.taskId), eq(tasks.projectId, plan.scope.projectId)));
      deletedTaskIds.push(d.taskId);
    }

    const resultJson = JSON.stringify({ createdTaskIds, updatedTaskIds, statusChangedTaskIds, deletedTaskIds });

    await input.ctx.db.insert(agentTaskPlannerApplies).values({
      draftId: draft.id,
      userId,
      projectId: draft.projectId,
      planHash: draft.planHash,
      resultJson,
    });

    await input.ctx.db
      .update(agentTaskPlannerDrafts)
      .set({ status: "applied", appliedAt: new Date(), updatedAt: new Date() })
      .where(eq(agentTaskPlannerDrafts.id, draft.id));

    return {
      applied: true as const,
      results: { createdTaskIds, updatedTaskIds, statusChangedTaskIds, deletedTaskIds },
    };
  },

  /**
   * General A1 draft — answers workspace questions with LLM.
   */
  async draft(input: AgentDraftInput): Promise<AgentDraftResult> {
    const profile =
      input.agentId === "workspace_concierge"
        ? a1WorkspaceConciergeProfile
        : input.agentId === "task_planner"
          ? a2TaskPlannerProfile
          : null;

    if (!profile) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown agentId: ${input.agentId}`,
      });
    }

    const draftId = createDraftId();

    // 1. Build context pack
    const contextPack =
      input.agentId === "workspace_concierge"
        ? await buildA1Context(input.ctx, input.scope)
        : await buildA2Context({
            ctx: input.ctx,
            scope: {
              orgId: input.scope?.orgId,
              projectId:
                typeof input.scope?.projectId === "number"
                  ? input.scope.projectId
                  : undefined,
            },
          });

    // 2. Build system prompt
    const systemPrompt =
      input.agentId === "workspace_concierge"
        ? getA1SystemPrompt(contextPack as Parameters<typeof getA1SystemPrompt>[0])
        : getA2SystemPrompt(contextPack as Parameters<typeof getA2SystemPrompt>[0]);

    // 3. Call LLM
    let outputJson: A1Output | TaskPlanDraft;
    try {
      const llmResponse = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input.message },
        ],
        temperature: 0.2,
        jsonMode: true,
      });

      if (input.agentId === "workspace_concierge") {
        // 4a. Parse + validate with repair loop (A1)
        const parseResult = await parseAndValidate(llmResponse.content, A1OutputSchema);

        if (!parseResult.success) {
          const safeScope = input.scope ?? {};
          outputJson = {
            intent: {
              type: "answer" as const,
              scope: { orgId: safeScope.orgId, projectId: safeScope.projectId },
            },
            answer: {
              summary: "I encountered an error processing your request. Please try rephrasing.",
              details: [parseResult.error],
            },
          };
        } else {
          outputJson = parseResult.data;
        }
      } else {
        // 4b. Parse + validate with repair loop (A2)
        const parseResult = await parseAndValidate(llmResponse.content, TaskPlanDraftSchema);

        if (!parseResult.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid A2 plan JSON: ${parseResult.error}`,
          });
        }

        const userId = requireUserId(input.ctx);
        const projectId = requireProjectId(input.scope);

        const computedPlanHash = computePlanHash(parseResult.data);
        const plan: TaskPlanDraft = {
          ...parseResult.data,
          planHash: computedPlanHash,
        };

        await input.ctx.db.insert(agentTaskPlannerDrafts).values({
          id: draftId,
          userId,
          projectId,
          message: input.message,
          planJson: JSON.stringify(plan),
          planHash: computedPlanHash,
          status: "draft",
        });

        outputJson = plan;
      }
    } catch (err) {
      // LLM call failed — return a safe fallback using context pack
      if (input.agentId === "workspace_concierge") {
        const contextFallback = await buildFallbackResponse(
          contextPack as Parameters<typeof buildFallbackResponse>[0],
          input,
        );
        outputJson = contextFallback;
      } else {
        throw err;
      }
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

      if (collab?.collaboratorId !== userId) {
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

      if (collab?.collaboratorId !== userId) {
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
