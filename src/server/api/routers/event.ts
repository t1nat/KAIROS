
import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../trpc";
import { events, eventComments, eventLikes, eventRsvps } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { type NewEvent } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(256),
  description: z.string().min(1, "Description is required"),
  eventDate: z.date(),
  region: z.enum([
    "sofia",
    "plovdiv",
    "varna",
    "burgas",
    "ruse",
    "stara_zagora",
    "pleven",
    "sliven",
    "dobrich",
    "shumen"
  ]), 
  imageUrl: z.string().url().optional(),
  enableRsvp: z.boolean().default(false),
  sendReminders: z.boolean().default(false),
});

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

const updateRsvpSchema = z.object({
  eventId: z.number(),
  status: z.enum(["going", "maybe", "not_going"]),
});

const sendRemindersSchema = z.void();

export const eventRouter = createTRPCRouter({
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, description, eventDate, region, imageUrl, enableRsvp, sendReminders } = input;
      const createdById = ctx.session.user.id;

      // Validate that region is not null
      if (!region) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Region is required",
        });
      }

      const newEvent: NewEvent = {
        title,
        description,
        eventDate,
        region, 
        imageUrl: imageUrl ?? null,
        createdById,
        enableRsvp,
        sendReminders,
      };

      await ctx.db.insert(events).values(newEvent);
      return { success: true };
    }),

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
          rsvps: {
            columns: { userId: true, status: true },
          },
        },
      });

      const currentUserId = ctx.session?.user?.id;

      return allEvents.map(event => {
        const rsvpCounts = {
          going: event.rsvps.filter(r => r.status === "going").length,
          maybe: event.rsvps.filter(r => r.status === "maybe").length,
          notGoing: event.rsvps.filter(r => r.status === "not_going").length,
        };

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

  updateRsvp: protectedProcedure
    .input(updateRsvpSchema)
    .mutation(async ({ ctx, input }) => {
      const currentUserId = ctx.session.user.id;

      // CHECK IF USER AKEREADY HAS RSVP
      const existingRsvp = await ctx.db.query.eventRsvps.findFirst({
        where: and(
          eq(eventRsvps.eventId, input.eventId),
          eq(eventRsvps.userId, currentUserId),
        ),
      });

      if (existingRsvp) {
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
    
  sendEventReminders: protectedProcedure
    .input(sendRemindersSchema)
    .mutation(async ({ ctx: _ctx }) => {
      console.log(`[Reminder Service] Running reminder check at ${new Date().toISOString()}`);
      return { success: true, message: "Reminder check initiated." };
    }),
});