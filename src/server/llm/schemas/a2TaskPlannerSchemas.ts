import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums (must match DB + task router)
// ---------------------------------------------------------------------------

export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

// Matches [`taskStatusEnum`](src/server/db/schema.ts:22) and
// [`taskRouter.updateStatus`](src/server/api/routers/task.ts:118)
export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
]);

// ---------------------------------------------------------------------------
// Draft primitives
// ---------------------------------------------------------------------------

const ISODateTimeStringSchema = z
  .string()
  // basic ISO-ish check; server should parse/validate as Date during apply
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:.+Z$/)
  .describe("ISO 8601 UTC timestamp, e.g. 2026-02-09T07:03:00.000Z");

export const TaskCreateDraftSchema = z
  .object({
    title: z.string().min(1).max(256),
    description: z.string().max(5000).default(""),
    priority: TaskPrioritySchema.default("medium"),
    assignedToId: z.string().min(1).optional(),
    acceptanceCriteria: z
      .array(z.string().min(1).max(200))
      .max(20)
      .default([]),
    orderIndex: z.number().int().min(0).optional(),
    dueDate: ISODateTimeStringSchema.nullable().optional(),
    /** Required for idempotency; must be unique per project for a given plan */
    clientRequestId: z.string().min(8).max(128),
  })
  .strict();

export const TaskUpdateDraftSchema = z
  .object({
    taskId: z.number().int().positive(),
    patch: z
      .object({
        title: z.string().min(1).max(256).optional(),
        description: z.string().max(5000).optional(),
        priority: TaskPrioritySchema.optional(),
        assignedToId: z.string().min(1).nullable().optional(),
        dueDate: ISODateTimeStringSchema.nullable().optional(),
      })
      .strict(),
    reason: z.string().max(500).optional(),
  })
  .strict();

export const TaskStatusChangeDraftSchema = z
  .object({
    taskId: z.number().int().positive(),
    status: TaskStatusSchema,
    reason: z.string().max(500).optional(),
  })
  .strict();

export const TaskDeleteDraftSchema = z
  .object({
    taskId: z.number().int().positive(),
    reason: z.string().min(1).max(500),
    /** Must be true for deletes to be considered at all */
    dangerous: z.boolean(),
  })
  .strict();

export const TaskPlanDiffPreviewSchema = z
  .object({
    // Models may omit individual arrays; default them so validation remains robust.
    creates: z.array(z.string().min(1)).max(50).default([]),
    updates: z.array(z.string().min(1)).max(50).default([]),
    statusChanges: z.array(z.string().min(1)).max(50).default([]),
    deletes: z.array(z.string().min(1)).max(50).default([]),
  })
  .strict();

export const TaskPlannerScopeSchema = z
  .object({
    orgId: z.union([z.string(), z.number()]).optional(),
    projectId: z.number().int().positive(),
  })
  .strict();

export const TaskPlanDraftSchema = z
  .object({
    agentId: z.literal("task_planner"),
    scope: TaskPlannerScopeSchema,

    creates: z.array(TaskCreateDraftSchema).max(30).default([]),
    updates: z.array(TaskUpdateDraftSchema).max(50).default([]),
    statusChanges: z.array(TaskStatusChangeDraftSchema).max(50).default([]),
    deletes: z.array(TaskDeleteDraftSchema).max(10).default([]),

    orderingRationale: z.string().max(2000).optional(),
    assigneeRationale: z.string().max(2000).optional(),

    risks: z.array(z.string().min(1).max(300)).max(20).default([]),
    questionsForUser: z.array(z.string().min(1).max(300)).max(10).default([]),

    // Models sometimes omit this; default it so the backend can still persist + show a plan.
    diffPreview: TaskPlanDiffPreviewSchema.default({
      creates: [],
      updates: [],
      statusChanges: [],
      deletes: [],
    }),

    /** Computed server-side from normalized plan JSON; model may omit */
    planHash: z.string().min(8).max(128).optional(),
  })
  .strict();

export type TaskPlanDraft = z.infer<typeof TaskPlanDraftSchema>;

// ---------------------------------------------------------------------------
// API shapes (tRPC)
// ---------------------------------------------------------------------------

export const TaskPlannerDraftInputSchema = z
  .object({
    message: z.string().min(1).max(20_000),
    scope: z
      .object({
        orgId: z.union([z.string(), z.number()]).optional(),
        projectId: z.number().int().positive().optional(),
      })
      .optional(),
    handoffContext: z.record(z.unknown()).optional(),
  })
  .strict();

export const TaskPlannerDraftOutputSchema = z
  .object({
    draftId: z.string().min(1),
    plan: TaskPlanDraftSchema,
  })
  .strict();

export type TaskPlannerDraftInput = z.infer<typeof TaskPlannerDraftInputSchema>;
export type TaskPlannerDraftOutput = z.infer<typeof TaskPlannerDraftOutputSchema>;

export const TaskPlannerConfirmInputSchema = z
  .object({
    draftId: z.string().min(1),
  })
  .strict();

export const TaskPlannerConfirmOutputSchema = z
  .object({
    confirmationToken: z.string().min(1),
    summary: z
      .object({
        creates: z.number().int().min(0),
        updates: z.number().int().min(0),
        statusChanges: z.number().int().min(0),
        deletes: z.number().int().min(0),
      })
      .strict(),
  })
  .strict();

export type TaskPlannerConfirmInput = z.infer<typeof TaskPlannerConfirmInputSchema>;
export type TaskPlannerConfirmOutput = z.infer<typeof TaskPlannerConfirmOutputSchema>;

export const TaskPlannerApplyInputSchema = z
  .object({
    draftId: z.string().min(1),
    confirmationToken: z.string().min(1),
  })
  .strict();

export const TaskPlannerApplyOutputSchema = z
  .object({
    applied: z.literal(true),
    results: z
      .object({
        createdTaskIds: z.array(z.number().int().positive()),
        updatedTaskIds: z.array(z.number().int().positive()),
        statusChangedTaskIds: z.array(z.number().int().positive()),
        deletedTaskIds: z.array(z.number().int().positive()),
      })
      .strict(),
  })
  .strict();

export type TaskPlannerApplyInput = z.infer<typeof TaskPlannerApplyInputSchema>;
export type TaskPlannerApplyOutput = z.infer<typeof TaskPlannerApplyOutputSchema>;
