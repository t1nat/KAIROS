// src/server/api/routers/event.ts

import { z } from "zod";
import { protectedProcedure, publicProcedure, createTRPCRouter } from "../trpc";
import { events, eventComments, eventLikes } from "~/server/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { type  NewEvent } from "~/server/db/schema"; // Assume you'll create a NewEvent type

// Define the input schema for creating an event
const createEventSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().min(1),
  eventDate: z.date(),
});

// Define the input schema for adding a comment
const addCommentSchema = z.object({
  eventId: z.number(),
  text: z.string().min(1).max(500),
});

// Define the input schema for liking an event
const toggleLikeSchema = z.object({
  eventId: z.number(),
});

export const eventRouter = createTRPCRouter({
  // 1. Create Event (POST - Protected)
  createEvent: protectedProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      const { title, description, eventDate } = input;
      const createdById = ctx.session.user.id;
      
      const newEvent: NewEvent = { // Assuming NewEvent is inferred from Drizzle
        title,
        description,
        eventDate,
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
            columns: { id: true, name: true, image: true }, // Select only necessary user data
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
            columns: { createdById: true }, // We only need the ID of the liker
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