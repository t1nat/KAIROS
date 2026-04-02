import { z } from "zod";

export const ConciergeIntentSchema = z
  .object({
    type: z.enum(["answer", "handoff", "draft_plan"]),
    scope: z
      .object({
        orgId: z.union([z.string(), z.number()]).optional(),
        projectId: z.union([z.string(), z.number()]).optional(),
      })
      .default({}),
  })
  .strip();

export const HandoffPlanSchema = z
  .object({
    targetAgent: z.enum([
      "task_planner",
      "notes_vault",
      "events_publisher",
      "org_admin",
    ]),
    context: z.record(z.unknown()),
    userIntent: z.string().min(1),
  })
  .strip();

export const ActionPlanDraftSchema = z
  .object({
    readQueries: z.array(
      z
        .object({
          tool: z.string().min(1),
          input: z.unknown(),
        })
        .strip(),
    ),
    proposedChanges: z.array(
      z
        .object({
          summary: z.string().min(1),
          affectedEntities: z.array(
            z
              .object({
                type: z.string().min(1),
                id: z.union([z.string(), z.number()]).optional(),
              })
              .strip(),
          ),
        })
        .strip(),
    ),
    applyCalls: z.array(
      z
        .object({
          tool: z.string().min(1),
          input: z.unknown(),
        })
        .strip(),
    ),
  })
  .strip();

export const A1OutputSchema = z
  .object({
    intent: ConciergeIntentSchema,
    answer: z
      .object({
        summary: z.string().min(1),
        details: z.array(z.string()).optional(),
      })
      .strip()
      .optional(),
    handoff: HandoffPlanSchema.optional(),
    draftPlan: ActionPlanDraftSchema.optional(),
    citations: z
      .array(
        z
          .object({
            label: z.string().min(1),
            ref: z.string().min(1),
          })
          .strip(),
      )
      .optional(),
  })
  .strip();

export type A1Output = z.infer<typeof A1OutputSchema>;
