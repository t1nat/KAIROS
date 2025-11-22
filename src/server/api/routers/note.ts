// src/server/api/routers/note.ts
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
      // 1. Prepare password data
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
      
      // 2. Database Insertion
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

        console.log("✅ Note Inserted Successfully. New ID:", newNote.id);
        return newNote;

      } catch (dbError) {
        console.error("❌ Database Insertion Error:", dbError); 
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
      // 1. Fetch the note
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.id),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      // 2. Authorization Check
      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      // 3. Password Protection Logic
      if (note.passwordHash) {
        if (!input.attemptedPassword) {
          // Content locked, prompt for password
          return {
            id: note.id,
            content: null, 
            isPasswordProtected: true, 
          };
        }

        // Verify the attempted password
        const isMatch = await bcrypt.compare(
          input.attemptedPassword, 
          note.passwordHash
        );

        if (!isMatch) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password." });
        }
      }

      // If unlocked, return the content
      return {
        id: note.id,
        content: note.content,
        isPasswordProtected: false, 
      };
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the note to verify ownership
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.id),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      // 2. Authorization Check
      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      // 3. Delete the note
      await ctx.db.delete(stickyNotes).where(eq(stickyNotes.id, input.id));

      return { success: true };
    }),

  verifyPassword: protectedProcedure
    .input(z.object({
      noteId: z.number(),
      password: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch the note
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.noteId),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      // 2. Authorization Check
      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      // 3. Check if password protected
      if (!note.passwordHash) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Note is not password protected." 
        });
      }

      // 4. Verify the password
      const isMatch = await bcrypt.compare(input.password, note.passwordHash);

      if (!isMatch) {
        return { valid: false };
      }

      // 5. Return the content if password is correct
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
      // 1. Fetch the note
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.noteId),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      // 2. Authorization Check
      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      // 3. Check if password protected
      if (!note.passwordHash) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Note is not password protected." 
        });
      }

      // 4. Check if user has an email
      if (!ctx.session.user.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No email associated with your account.",
        });
      }

      // 5. Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = await bcrypt.hash(resetToken, 10);
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // 6. Update note with reset token
      await ctx.db.update(stickyNotes)
        .set({
          resetToken: resetTokenHash,
          resetTokenExpiry: resetTokenExpiry,
        })
        .where(eq(stickyNotes.id, input.noteId));

      // 7. Send email
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
        
        // Provide more specific error message
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
      // 1. Fetch the note
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.noteId),
      });

      if (!note) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
      }

      // 2. Authorization Check
      if (note.createdById !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You don't own this note." });
      }

      // 3. Verify reset token exists and hasn't expired
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

      // 4. Verify the token
      const isValidToken = await bcrypt.compare(input.resetToken, note.resetToken);

      if (!isValidToken) {
        throw new TRPCError({ 
          code: "UNAUTHORIZED", 
          message: "Invalid reset token." 
        });
      }

      // 5. Hash new password
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const newPasswordHash = await bcrypt.hash(input.newPassword, salt);

      // 6. Update note with new password and clear reset token
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