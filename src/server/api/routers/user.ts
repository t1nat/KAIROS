// src/server/api/routers/user.ts (DRIZZLE VERSION)

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users, organizationMembers } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  // Set user to personal mode
  setPersonalMode: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.update(users)
        .set({ usageMode: "personal" })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Check if user needs onboarding
  checkOnboardingStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        with: {
          organizationMemberships: {
            limit: 1,
          },
        },
      });

      return {
        needsOnboarding: !user?.usageMode,
        usageMode: user?.usageMode,
        hasOrganization: (user?.organizationMemberships?.length ?? 0) > 0,
      };
    }),

  // Get user profile with organization info
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        with: {
          organizationMemberships: {
            with: {
              organization: true,
            },
          },
        },
      });

      return user;
    }),
});