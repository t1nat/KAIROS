// src/server/api/routers/event.ts

import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../trpc";
import { events, eventComments, eventLikes } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { type  NewEvent } from "~/server/db/schema";

// Define the input schema for creating an event
const createEventSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1),
  eventDate: z.date(),
  imageUrl: z.string().url().optional(),
});

// Updated schema: text can be empty if there's an image
const addCommentSchema = z.object({
  eventId: z.number(),
  text: z.string().max(500), // Removed .min(1) to allow empty strings
  imageUrl: z.string().url().optional(),
}).refine(
  (data) => data.text.trim().length > 0 || data.imageUrl !== undefined,
  { message: "Comment must have either text or an image" }
);

// Define the input schema for liking an event
const toggleLikeSchema = z.object({
  eventId: z.number(),
});

export const eventRouter = createTRPCRouter({
  // 1. Create Event (POST - Protected)
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, description, eventDate, imageUrl } = input;
      const createdById = ctx.session.user.id;
      
      const newEvent: NewEvent = {
        title,
        description,
        eventDate,
        imageUrl,
        createdById,
      };

      await ctx.db.insert(events).values(newEvent);
      return { success: true };
    }),

  // 2. Get Public Events (GET - Public)
  getPublicEvents: publicProcedure
    .query(async ({ ctx }) => {
      // Fetch all events, eagerly loading comments, likes, and the author details
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
          }
        },
      });

      // Augment the data to include aggregated counts and whether the current user liked it
      const currentUserId = ctx.session?.user?.id;

      return allEvents.map(event => ({
        ...event,
        commentCount: event.comments.length,
        likeCount: event.likes.length,
        hasLiked: currentUserId 
          ? event.likes.some(like => like.createdById === currentUserId) 
          : false,
      }));
    }),

  // 3. Add Comment (POST - Protected)
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

  // 4. Toggle Like (POST/PUT - Protected)
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
        // Unlike the event
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
        // Like the event
        await ctx.db.insert(eventLikes).values({
          eventId: input.eventId,
          createdById: currentUserId,
        });
        return { action: 'liked' };
      }
    }),
});