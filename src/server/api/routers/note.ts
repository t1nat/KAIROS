// src/server/api/routers/note.ts
import { z } from "zod";
// 🚨 FIX 1: Import TRPCError
import { TRPCError } from "@trpc/server"; 

import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { stickyNotes } from "~/server/db/schema";
import bcrypt from 'bcryptjs'; 
import { eq } from "drizzle-orm";

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
            throw new Error("Failed to secure note password.");
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
        }).returning({ id: stickyNotes.id }); 

        if (!newNote) {
            console.error("❌ Insertion failed, returned no note.");
            throw new Error("Note creation failed unexpectedly.");
        }

        console.log("✅ Note Inserted Successfully. New ID:", newNote.id);
        return newNote;

      } catch (dbError) {
        console.error("❌ Database Insertion Error:", dbError); 
        throw new Error("Database insertion failed. Check your schema and database logs.");
      }
    }),
    
  // 🚨 FIX 2: Added a comma and moved 'getOne' inside the object
  getOne: protectedProcedure 
    .input(z.object({
      id: z.number(),
      attemptedPassword: z.string().optional(), 
    }))
    .query(async ({ ctx, input }) => {
      // 1. Fetch the note
      const note = await ctx.db.query.stickyNotes.findFirst({
        where: eq(stickyNotes.id, input.id),
        columns: {
          id: true,
          content: true,
          createdById: true,
          passwordHash: true, 
          passwordSalt: true, 
        },
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
});