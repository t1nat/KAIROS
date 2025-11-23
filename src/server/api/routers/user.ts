// src/server/api/routers/user.ts - FIXED

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const userRouter = createTRPCRouter({
  // Get current user info (for userDisplay and other components)
  getCurrentUser: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),

  // Set user to personal mode
  setPersonalMode: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.update(users)
        .set({ usageMode: "personal" })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Get user profile - returns null if user hasn't completed onboarding
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          id: true,
          usageMode: true,
          name: true,
          email: true,
        },
        with: {
          organizationMemberships: {
            limit: 1,
            with: {
              organization: true,
            },
          },
        },
      });

      // Return null if user hasn't set their usage mode (needs onboarding)
      if (!user?.usageMode) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        usageMode: user.usageMode,
        organization: user.organizationMemberships[0]?.organization ?? null,
        role: user.organizationMemberships[0]?.role ?? null,
      };
    }),

  // Check if user needs onboarding
  checkOnboardingStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          usageMode: true,
        },
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
});