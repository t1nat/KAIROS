import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { stickyNotes, users } from "~/server/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as argon2 from "argon2";

export const noteRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      content: z.string().min(1),
      password: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      let passwordHash: string | null = null;
      let passwordSalt: string | null = null;

      if (input.password && input.password.length > 0) {
        try { 
          const saltRounds = 10;
          const salt = await bcrypt.genSalt(saltRounds);
          passwordSalt = salt;
          passwordHash = await bcrypt.hash(input.password, salt);
          if (process.env.NODE_ENV !== "production") {
            console.log("Password Hashed Successfully.");
          }
        } catch (hashError) {
          console.error("❌ Hashing Error:", hashError); 
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Failed to secure note password." 
          });
        }
      }
      
      try {
        const [newNote] = await ctx.db.insert(stickyNotes).values({
          content: input.content,
          createdById: ctx.session.user.id,
          passwordHash: passwordHash, 
          passwordSalt: passwordSalt,
          shareStatus: 'private', 
        }).returning(); 

        if (!newNote) {
          console.error("❌ Insertion failed, returned no note.");
          throw new TRPCError({ 
            code: "INTERNAL_SERVER_ERROR", 
            message: "Note creation failed unexpectedly." 
          });
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("Note Inserted Successfully. New ID:", newNote.id);
        }
        return newNote;

      } catch (dbError) {
        console.error("Database Insertion Error:", dbError); 
        throw new TRPCError({ 
          code: "INTERNAL_SERVER_ERROR", 
          message: "Database insertion failed. Check your schema and database logs." 
        });
      }
    }),

  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const notes = await ctx.db.query.stickyNotes.findMany({
        where: eq(stickyNotes.createdById, ctx.session.user.id),
        orderBy: (notes, { desc }) => [desc(notes.createdAt)],
      });

      // IMPORTANT: never ship plaintext content for password-protected notes.
      // The client must unlock via password before fetching content.
      return notes.map((n) => {
        if (n.passwordHash) {
          return {
            id: n.id,
            createdAt: n.createdAt,
            passwordHash: n.passwordHash,
            shareStatus: n.shareStatus,
            // content intentionally omitted
            content: null,
          };
        }

        return n;
      });
    }),
    
  getOne: protectedProcedure 
    .input(z.object({
      id: z.number(),
      attemptedPassword: z.string().optional(), 
    }))
    .query(async ({ ctx, input }) => {
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.id),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      if (note.passwordHash) {
        if (!input.attemptedPassword) {
          return {
            id: note.id,
            content: null, 
            isPasswordProtected: true, 
          };
        }

        const isMatch = await bcrypt.compare(
          input.attemptedPassword, 
          note.passwordHash
        );

        if (!isMatch) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password." });
        }
      }

      return {
        id: note.id,
        content: note.content,
        isPasswordProtected: false, 
      };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      content: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.id),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      await ctx.db.update(stickyNotes)
        .set({ content: input.content })
        .where(eq(stickyNotes.id, input.id));

      return { success: true, message: "Note updated successfully" };
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.id),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      await ctx.db.delete(stickyNotes).where(eq(stickyNotes.id, input.id));

      return { success: true };
    }),

  verifyPassword: protectedProcedure
    .input(z.object({
      noteId: z.number(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.noteId),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      if (!note.passwordHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Note is not password protected."
        });
      }

      const isMatch = await bcrypt.compare(input.password, note.passwordHash);

      if (!isMatch) {
        return { valid: false };
      }

      return {
        valid: true,
        content: note.content
      };
    }),

  /**
   * Reset a note password using the user's secret reset PIN.
   */
  resetPasswordWithPin: protectedProcedure
    .input(
      z.object({
        noteId: z.number(),
        newPassword: z.string().min(1),
        resetPin: z.string().regex(/^\d{4,}$/ , "PIN must be at least 4 digits"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.user.id),
      });

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      if (!user.resetPinHash) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No reset PIN configured",
        });
      }

      if (user.resetPinLockedUntil && now < user.resetPinLockedUntil) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Reset PIN temporarily locked due to too many failed attempts",
        });
      }

      const pinValid = await argon2.verify(user.resetPinHash, input.resetPin);

      const MAX_ATTEMPTS = 5;
      const LOCKOUT_MINUTES = 15;

      if (!pinValid) {
        const failedAttempts = (user.resetPinFailedAttempts ?? 0) + 1;
        const updates: Partial<typeof users.$inferInsert> = {
          resetPinFailedAttempts: failedAttempts,
          resetPinLastFailedAt: now,
        };

        if (failedAttempts >= MAX_ATTEMPTS) {
          updates.resetPinLockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60_000);
        }

        await ctx.db.update(users)
          .set(updates)
          .where(eq(users.id, ctx.session.user.id));

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Incorrect reset PIN",
        });
      }

      // PIN is valid – reset lockout state
      await ctx.db.update(users)
        .set({
          resetPinFailedAttempts: 0,
          resetPinLockedUntil: null,
          resetPinLastFailedAt: null,
        })
        .where(eq(users.id, ctx.session.user.id));

      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.noteId),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const newPasswordHash = await bcrypt.hash(input.newPassword, salt);

      await ctx.db
        .update(stickyNotes)
        .set({
          passwordHash: newPasswordHash,
          passwordSalt: salt,
        })
        .where(eq(stickyNotes.id, input.noteId));

      return { success: true, message: "Password reset successfully" };
    }),
});