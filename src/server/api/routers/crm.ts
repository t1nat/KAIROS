import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, ilike, or } from "drizzle-orm";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  crmAccounts,
  crmDeals,
  crmPipelines,
  crmStages,
} from "~/server/db/schemas/crm";
import {
  canCrmReadOwnedRecord,
  canCrmWriteOwnedRecord,
  requireOrgMembership,
  requireUser,
} from "~/server/crm/access";

/**
 * CRM router (MVP):
 * - accounts.list/create/getById/update
 * - pipelines.getDefault
 * - deals.list/create/getById/update
 *
 * NOTE: This is intentionally minimal to establish end-to-end plumbing.
 */
export const crmRouter = createTRPCRouter({
  accounts: createTRPCRouter({
    list: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          query: z.string().max(256).optional(),
          limit: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        // MVP: admins can list all; others list only their owned accounts.
        const where = and(
          eq(crmAccounts.organizationId, input.organizationId),
          membership.role === "admin"
            ? undefined
            : eq(crmAccounts.ownerUserId, user.id),
          input.query
            ? or(
                ilike(crmAccounts.name, `%${input.query}%`),
                ilike(crmAccounts.domain, `%${input.query}%`),
              )
            : undefined,
        );

        const items = await ctx.db
          .select({
            id: crmAccounts.id,
            name: crmAccounts.name,
            domain: crmAccounts.domain,
            ownerUserId: crmAccounts.ownerUserId,
            lastActivityAt: crmAccounts.lastActivityAt,
          })
          .from(crmAccounts)
          .where(where)
          .orderBy(desc(crmAccounts.lastActivityAt), desc(crmAccounts.id))
          .limit(input.limit);

        return { items };
      }),

    getById: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          id: z.number().int().positive(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        const account = await ctx.db.query.crmAccounts.findFirst({
          where: and(
            eq(crmAccounts.organizationId, input.organizationId),
            eq(crmAccounts.id, input.id),
          ),
        });

        if (!account) return null;

        if (
          !canCrmReadOwnedRecord({
            membership,
            ownerUserId: account.ownerUserId,
            sessionUserId: user.id,
          })
        ) {
          return null;
        }

        return account;
      }),

    create: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          name: z.string().min(1).max(256),
          domain: z.string().max(256).optional(),
          industry: z.string().max(128).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        if (membership.role === "mentor" || membership.role === "guest") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const [created] = await ctx.db
          .insert(crmAccounts)
          .values({
            organizationId: input.organizationId,
            name: input.name,
            domain: input.domain,
            industry: input.industry,
            ownerUserId: user.id,
          })
          .returning();

        return created!;
      }),

    update: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          id: z.number().int().positive(),
          patch: z
            .object({
              name: z.string().min(1).max(256).optional(),
              domain: z.string().max(256).nullable().optional(),
              industry: z.string().max(128).nullable().optional(),
              ownerUserId: z.string().min(1).max(255).optional(),
            })
            .strict(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        const existing = await ctx.db.query.crmAccounts.findFirst({
          where: and(
            eq(crmAccounts.organizationId, input.organizationId),
            eq(crmAccounts.id, input.id),
          ),
          columns: {
            id: true,
            ownerUserId: true,
          },
        });

        if (!existing) return null;

        if (
          !canCrmWriteOwnedRecord({
            membership,
            ownerUserId: existing.ownerUserId,
            sessionUserId: user.id,
          })
        ) {
          return null;
        }

        const [updated] = await ctx.db
          .update(crmAccounts)
          .set({
            ...input.patch,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(crmAccounts.organizationId, input.organizationId),
              eq(crmAccounts.id, input.id),
            ),
          )
          .returning();

        return updated!;
      }),
  }),

  pipelines: createTRPCRouter({
    getDefault: protectedProcedure
      .input(z.object({ organizationId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        await requireOrgMembership(ctx, input.organizationId);

        const pipeline = await ctx.db.query.crmPipelines.findFirst({
          where: and(
            eq(crmPipelines.organizationId, input.organizationId),
            eq(crmPipelines.isDefault, true),
          ),
        });

        if (!pipeline) return null;

        const stages = await ctx.db.query.crmStages.findMany({
          where: eq(crmStages.pipelineId, pipeline.id),
          orderBy: (t, { asc }) => [asc(t.order)],
        });

        return { pipeline, stages };
      }),
  }),

  deals: createTRPCRouter({
    list: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          query: z.string().max(256).optional(),
          limit: z.number().int().min(1).max(100).default(25),
        }),
      )
      .query(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        const where = and(
          eq(crmDeals.organizationId, input.organizationId),
          membership.role === "admin" ? undefined : eq(crmDeals.ownerUserId, user.id),
          input.query ? ilike(crmDeals.name, `%${input.query}%`) : undefined,
        );

        const items = await ctx.db
          .select({
            id: crmDeals.id,
            name: crmDeals.name,
            amount: crmDeals.amount,
            closeDate: crmDeals.closeDate,
            ownerUserId: crmDeals.ownerUserId,
            stageId: crmDeals.stageId,
            pipelineId: crmDeals.pipelineId,
            nextActivityAt: crmDeals.nextActivityAt,
            lastActivityAt: crmDeals.lastActivityAt,
          })
          .from(crmDeals)
          .where(where)
          .orderBy(desc(crmDeals.lastActivityAt), desc(crmDeals.id))
          .limit(input.limit);

        return { items };
      }),

    getById: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          id: z.number().int().positive(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        const deal = await ctx.db.query.crmDeals.findFirst({
          where: and(
            eq(crmDeals.organizationId, input.organizationId),
            eq(crmDeals.id, input.id),
          ),
        });

        if (!deal) return null;

        if (
          !canCrmReadOwnedRecord({
            membership,
            ownerUserId: deal.ownerUserId,
            sessionUserId: user.id,
          })
        ) {
          return null;
        }

        return deal;
      }),

    create: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          accountId: z.number().int().positive(),
          // MVP: if not provided, use org default pipeline + first stage
          pipelineId: z.number().int().positive().optional(),
          stageId: z.number().int().positive().optional(),
          name: z.string().min(1).max(256),
          amount: z.number().optional(),
          currency: z.string().length(3).optional(),
          // MVP: accept ISO date string (YYYY-MM-DD)
          closeDate: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        if (membership.role === "mentor" || membership.role === "guest") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        let pipelineId = input.pipelineId;
        let stageId = input.stageId;

        if (!pipelineId || !stageId) {
          const pipeline = await ctx.db.query.crmPipelines.findFirst({
            where: and(
              eq(crmPipelines.organizationId, input.organizationId),
              eq(crmPipelines.isDefault, true),
            ),
          });

          if (!pipeline) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "CRM pipeline is not initialized for this organization.",
            });
          }

          const firstStage = await ctx.db.query.crmStages.findFirst({
            where: eq(crmStages.pipelineId, pipeline.id),
            orderBy: (t, { asc }) => [asc(t.order)],
          });

          if (!firstStage) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "CRM stages are not initialized for this organization.",
            });
          }

          pipelineId = pipeline.id;
          stageId = firstStage.id;
        }

        const [created] = await ctx.db
          .insert(crmDeals)
          .values({
            organizationId: input.organizationId,
            accountId: input.accountId,
            pipelineId,
            stageId,
            name: input.name,
            amount: input.amount !== undefined ? String(input.amount) : "0",
            currency: input.currency ?? "USD",
            closeDate: input.closeDate
              ? (new Date(input.closeDate).toISOString().split("T")[0] as string)
              : null,
            ownerUserId: user.id,
          })
          .returning();

        return created!;
      }),

    update: protectedProcedure
      .input(
        z.object({
          organizationId: z.number().int().positive(),
          id: z.number().int().positive(),
          patch: z
            .object({
              name: z.string().min(1).max(256).optional(),
              amount: z.string().optional(),
              closeDate: z.string().nullable().optional(),
              nextActivityAt: z.string().nullable().optional(),
              forecastCategory: z.string().optional(),
              ownerUserId: z.string().min(1).max(255).optional(),
            })
            .strict(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const user = await requireUser(ctx);
        const membership = await requireOrgMembership(ctx, input.organizationId);

        const existing = await ctx.db.query.crmDeals.findFirst({
          where: and(
            eq(crmDeals.organizationId, input.organizationId),
            eq(crmDeals.id, input.id),
          ),
          columns: {
            id: true,
            ownerUserId: true,
          },
        });

        if (!existing) return null;

        if (
          !canCrmWriteOwnedRecord({
            membership,
            ownerUserId: existing.ownerUserId,
            sessionUserId: user.id,
          })
        ) {
          return null;
        }

        const patch: Record<string, unknown> = { ...input.patch, updatedAt: new Date() };
        if (input.patch.closeDate !== undefined) {
          patch.closeDate = input.patch.closeDate ? (new Date(input.patch.closeDate).toISOString().split("T")[0] as string) : null;
        }
        if (input.patch.nextActivityAt !== undefined) {
          patch.nextActivityAt = input.patch.nextActivityAt
            ? new Date(input.patch.nextActivityAt)
            : null;
        }

        const [updated] = await ctx.db
          .update(crmDeals)
          .set(patch)
          .where(and(eq(crmDeals.organizationId, input.organizationId), eq(crmDeals.id, input.id)))
          .returning();

        return updated!;
      }),
  }),
});
