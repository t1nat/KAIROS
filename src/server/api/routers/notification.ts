
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifications } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const notificationRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userNotifications = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.session.user.id))
      .orderBy(desc(notifications.createdAt));

    return userNotifications;
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unreadNotifications = await ctx.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          eq(notifications.read, false)
        )
      );

    return unreadNotifications.length;
  }),

  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const idParts = input.notificationId.split("-");
      const actualId = idParts.length > 1 ? parseInt(idParts[1]!) : parseInt(input.notificationId);

      if (isNaN(actualId)) {
        return { success: true, message: "Client-side notification marked as read" };
      }

      const notification = await ctx.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.id, actualId),
            eq(notifications.userId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (notification.length === 0) {
        return { success: true, message: "Notification not found or already handled" };
      }


      await ctx.db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, actualId));

      return { success: true, message: "Notification marked as read" };
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, ctx.session.user.id),
          eq(notifications.read, false)
        )
      );

    return { success: true, message: "All notifications marked as read" };
  }),

  delete: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = parseInt(input.notificationId);
      
      if (isNaN(id)) {
        return { success: true, message: "Client-side notification removed" };
      }

      await ctx.db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.userId, ctx.session.user.id)
          )
        );

      return { success: true, message: "Notification deleted" };
    }),

  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(notifications)
      .where(eq(notifications.userId, ctx.session.user.id));

    return { success: true, message: "All notifications deleted" };
  }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["event", "task", "project", "system", "like", "comment", "reply"]),
        title: z.string(),
        message: z.string(),
        link: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [notification] = await ctx.db
        .insert(notifications)
        .values({
          userId: ctx.session.user.id,
          type: input.type,
          title: input.title,
          message: input.message,
          link: input.link,
          read: false,
        })
        .returning();

      return notification;
    }),
});