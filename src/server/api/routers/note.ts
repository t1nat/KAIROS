import { z } from "zod";
import { TRPCError } from "@trpc/server"; 
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { stickyNotes } from "~/server/db/schema";
import bcrypt from 'bcryptjs'; 
import { eq } from "drizzle-orm";
import crypto from 'crypto';
import { sendPasswordResetEmail } from "~/server/email";

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
          console.log("Password Hashed Successfully."); 
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

        console.log("Note Inserted Successfully. New ID:", newNote.id);
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

      return notes;
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

  requestPasswordReset: protectedProcedure
    .input(z.object({
      noteId: z.number(),
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

      if (!ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email associated with your account.",
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      await ctx.db.update(stickyNotes)
        .set({
          resetToken: resetTokenHash,
          resetTokenExpiry: resetTokenExpiry,
        })
        .where(eq(stickyNotes.id, input.noteId));

      try {
        await sendPasswordResetEmail({
          email: ctx.session.user.email,
          userName: ctx.session.user.name ?? 'User',
          noteId: input.noteId,
          resetToken: resetToken,
        });

        return { success: true, message: "Reset email sent successfully" };
      } catch (emailError) {
        console.error("❌ Email Error:", emailError);
        
        const errorMessage = emailError instanceof Error 
          ? emailError.message 
          : "Failed to send reset email. Please try again later.";
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: errorMessage,
        });
      }
    }),

  resetPassword: protectedProcedure
    .input(z.object({
      noteId: z.number(),
      resetToken: z.string(),
      newPassword: z.string().min(1),
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

      if (!note.resetToken || !note.resetTokenExpiry) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "No password reset requested for this note." 
        });
      }

      if (new Date() > note.resetTokenExpiry) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Reset link has expired. Please request a new one." 
        });
      }

      const isValidToken = await bcrypt.compare(input.resetToken, note.resetToken);

      if (!isValidToken) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED", 
          message: "Invalid reset token." 
        });
      }

      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const newPasswordHash = await bcrypt.hash(input.newPassword, salt);

      await ctx.db.update(stickyNotes)
        .set({
          passwordHash: newPasswordHash,
          passwordSalt: salt,
          resetToken: null,
          resetTokenExpiry: null,
        })
        .where(eq(stickyNotes.id, input.noteId));

      return { success: true, message: "Password reset successfully" };
    }),
});