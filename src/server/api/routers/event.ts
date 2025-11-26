// src/server/api/routers/event.ts

import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../trpc";
import { events, eventComments, eventLikes, eventRsvps } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { type NewEvent } from "~/server/db/schema";

// Define the input schema for creating an event
const createEventSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1),
  eventDate: z.date(),
  imageUrl: z.string().url().optional(),
  enableRsvp: z.boolean().default(false), // NEW FIELD
});

// Updated schema: text can be empty if there's an image
const addCommentSchema = z.object({
  eventId: z.number(),
  text: z.string().max(500),
  imageUrl: z.string().url().optional(),
}).refine(
  (data) => data.text.trim().length > 0 || data.imageUrl !== undefined,
  { message: "Comment must have either text or an image" }
);

const toggleLikeSchema = z.object({
  eventId: z.number(),
});

// NEW: RSVP Schema
const updateRsvpSchema = z.object({
  eventId: z.number(),
  status: z.enum(["going", "maybe", "not_going"]),
});

const sendRemindersSchema = z.void();

export const eventRouter = createTRPCRouter({
  // 1. Create Event
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, description, eventDate, imageUrl, enableRsvp } = input;
      const createdById = ctx.session.user.id;

      const newEvent: NewEvent = {
        title,
        description,
        eventDate,
        imageUrl,
        createdById,
        enableRsvp, // NEW FIELD
      };

      await ctx.db.insert(events).values(newEvent);
      return { success: true };
    }),

  // 2. Get Public Events with RSVP counts
  getPublicEvents: publicProcedure
    .query(async ({ ctx }) => {
      const allEvents = await ctx.db.query.events.findMany({
        orderBy: desc(events.createdAt),
        with: {
          author: {
            columns: { id: true, name: true, image: true },
          },
          comments: {
            with: {
              author: {
                columns: { name: true, image: true },
              },
            },
            orderBy: desc(eventComments.createdAt),
          },
          likes: {
            columns: { createdById: true },
          },
          rsvps: { // NEW: Include RSVPs
            columns: { userId: true, status: true },
          },
        },
      });

      const currentUserId = ctx.session?.user?.id;

      return allEvents.map(event => {
        // Calculate RSVP counts
        const rsvpCounts = {
          going: event.rsvps.filter(r => r.status === "going").length,
          maybe: event.rsvps.filter(r => r.status === "maybe").length,
          notGoing: event.rsvps.filter(r => r.status === "not_going").length,
        };

        // Find current user's RSVP status
        const userRsvp = currentUserId 
          ? event.rsvps.find(r => r.userId === currentUserId)
          : null;

        return {
          ...event,
          commentCount: event.comments.length,
          likeCount: event.likes.length,
          hasLiked: currentUserId
            ? event.likes.some(like => like.createdById === currentUserId)
            : false,
          rsvpCounts,
          userRsvpStatus: userRsvp?.status ?? null,
        };
      });
    }),

  // 3. Add Comment
  addComment: protectedProcedure
    .input(addCommentSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(eventComments).values({
        eventId: input.eventId,
        text: input.text,
        imageUrl: input.imageUrl,
        createdById: ctx.session.user.id,
      });
      return { success: true };
    }),

  // 4. Toggle Like
  toggleLike: protectedProcedure
    .input(toggleLikeSchema)
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      const existingLike = await ctx.db.query.eventLikes.findFirst({
        where: and(
          eq(eventLikes.eventId, input.eventId),
          eq(eventLikes.createdById, currentUserId),
        ),
      });

      if (existingLike) {
        await ctx.db
          .delete(eventLikes)
          .where(
            and(
              eq(eventLikes.eventId, input.eventId),
              eq(eventLikes.createdById, currentUserId),
            ),
          );
        return { action: 'unliked' };
      } else {
        await ctx.db.insert(eventLikes).values({
          eventId: input.eventId,
          createdById: currentUserId,
        });
        return { action: 'liked' };
      }
    }),

  // NEW: 5. Update RSVP
  updateRsvp: protectedProcedure
    .input(updateRsvpSchema)
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      // Check if user already has an RSVP
      const existingRsvp = await ctx.db.query.eventRsvps.findFirst({
        where: and(
          eq(eventRsvps.eventId, input.eventId),
          eq(eventRsvps.userId, currentUserId),
        ),
      });

      if (existingRsvp) {
        // Update existing RSVP
        await ctx.db
          .update(eventRsvps)
          .set({ 
            status: input.status,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(eventRsvps.eventId, input.eventId),
              eq(eventRsvps.userId, currentUserId),
            ),
          );
      } else {
        // Create new RSVP
        await ctx.db.insert(eventRsvps).values({
          eventId: input.eventId,
          userId: currentUserId,
          status: input.status,
        });
      }

      return { success: true, status: input.status };
    }),
    
  // 6. Send Event Reminders
  sendEventReminders: protectedProcedure
    .input(sendRemindersSchema)
    .mutation(async ({ ctx: _ctx }) => {
      console.log(`[Reminder Service] Running reminder check at ${new Date().toISOString()}`);
      return { success: true, message: "Reminder check initiated." };
    }),
});