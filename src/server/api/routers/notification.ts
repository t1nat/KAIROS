// src/server/api/routers/notification.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { notifications } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const notificationRouter = createTRPCRouter({
  // Get all notifications for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userNotifications = await ctx.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.session.user.id))
      .orderBy(desc(notifications.createdAt));

    return userNotifications;
  }),

  // Get unread notification count
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

  // Mark a notification as read
  markAsRead: protectedProcedure
    .input(
      z.object({
        notificationId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Extract the actual notification ID from compound ID (e.g., "event-123" -> 123)
      const idParts = input.notificationId.split("-");
      const actualId = idParts.length > 1 ? parseInt(idParts[1]!) : parseInt(input.notificationId);

      if (isNaN(actualId)) {
        return { success: true, message: "Client-side notification marked as read" };
      }

      // Try to find the notification
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

      // Update the notification
      await ctx.db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, actualId));

      return { success: true, message: "Notification marked as read" };
    }),

  // Mark all notifications as read
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

  // Delete a notification
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

  // Delete all notifications
  deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .delete(notifications)
      .where(eq(notifications.userId, ctx.session.user.id));

    return { success: true, message: "All notifications deleted" };
  }),

  // Create a notification
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["event", "task", "project", "system"]),
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