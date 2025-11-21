// src/server/api/routers/settings.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = createTRPCRouter({
  // Get all user settings
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true,
          // Notifications
          emailNotifications: true,
          projectUpdatesNotifications: true,
          eventRemindersNotifications: true,
          marketingEmailsNotifications: true,
          // Language & Region
          language: true,
          timezone: true,
          dateFormat: true,
          // Appearance
          theme: true,
          accentColor: true,
          // Privacy
          profileVisibility: true,
          showOnlineStatus: true,
          activityTracking: true,
          dataCollection: true,
          // Security
          twoFactorEnabled: true,
          // Account
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),

  // Update profile settings
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255).optional(),
      bio: z.string().max(1000).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({
          name: input.name,
          bio: input.bio,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Update notification settings
  updateNotifications: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      projectUpdatesNotifications: z.boolean().optional(),
      eventRemindersNotifications: z.boolean().optional(),
      marketingEmailsNotifications: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Update language & region settings
  updateLanguageRegion: protectedProcedure
    .input(z.object({
      language: z.enum(["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar"]).optional(),
      timezone: z.string().optional(),
      dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Update appearance settings
  updateAppearance: protectedProcedure
    .input(z.object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      accentColor: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Update privacy settings
  updatePrivacy: protectedProcedure
    .input(z.object({
      profileVisibility: z.boolean().optional(),
      showOnlineStatus: z.boolean().optional(),
      activityTracking: z.boolean().optional(),
      dataCollection: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),

  // Request data export
  requestDataExport: protectedProcedure
    .mutation(async ({ ctx }) => {
      // TODO: Implement actual data export logic
      return { 
        success: true,
        message: "Data export request received. You'll receive an email when it's ready."
      };
    }),

  // Delete all user data
  deleteAllData: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.delete(users)
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),
});