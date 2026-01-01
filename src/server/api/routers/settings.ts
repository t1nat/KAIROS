

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = createTRPCRouter({
 
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
         
          emailNotifications: true,
          projectUpdatesNotifications: true,
          eventRemindersNotifications: true,
          taskDueRemindersNotifications: true,
          marketingEmailsNotifications: true,
        
          language: true,
          timezone: true,
          dateFormat: true,
         
          theme: true,
          accentColor: true,
        
          profileVisibility: true,
          showOnlineStatus: true,
          activityTracking: true,
          dataCollection: true,
        
          twoFactorEnabled: true,
          
          createdAt: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),


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


  updateNotifications: protectedProcedure
    .input(z.object({
      emailNotifications: z.boolean().optional(),
      projectUpdatesNotifications: z.boolean().optional(),
      eventRemindersNotifications: z.boolean().optional(),
      taskDueRemindersNotifications: z.boolean().optional(),
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

 
  updateLanguageRegion: protectedProcedure
    .input(z.object({
      language: z.enum(["en", "bg", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar"]).optional(),
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

  updateSecurity: protectedProcedure
    .input(z.object({
      twoFactorEnabled: z.boolean().optional(),
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


  updatePrivacy: protectedProcedure
    .input(z.object({
      profileVisibility: z.boolean().optional(),
      showOnlineStatus: z.boolean().optional(),
      activityTracking: z.boolean().optional(),
      dataCollection: z.boolean().optional(),
      twoFactorEnabled: z.boolean().optional(),
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


  requestDataExport: protectedProcedure
    .mutation(async ({ ctx:_ctx }) => {
  
      return { 
        success: true,
        message: "Data export request received. You'll receive an email when it's ready."
      };
    }),

 
  deleteAllData: protectedProcedure
    .mutation(async ({ ctx }) => {
      await ctx.db.delete(users)
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),
});