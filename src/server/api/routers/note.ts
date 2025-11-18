// src/server/api/routers/note.ts
import { z } from "zod";
import { protectedProcedure, createTRPCRouter } from "~/server/api/trpc";
import { stickyNotes } from "~/server/db/schema";
// Assuming 'bcryptjs' is installed: npm install bcryptjs
import bcrypt from 'bcryptjs'; 

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
          // Drizzle expects null for optional fields if nothing is provided
          passwordHash: passwordHash, 
          passwordSalt: passwordSalt,
          shareStatus: 'private', 
        }).returning({ id: stickyNotes.id }); 

        // CRITICAL FIX: Ensure a row was returned (check for silent DB failure)
        if (!newNote) {
            console.error("❌ Insertion failed, returned no note. Check DB constraints/foreign keys.");
            throw new Error("Note creation failed unexpectedly.");
        }

        console.log("✅ Note Inserted Successfully. New ID:", newNote.id);
        return newNote;

      } catch (dbError) {
        console.error("❌ Database Insertion Error:", dbError); 
        // Throw an error that tRPC/client can handle
        throw new Error("Database insertion failed. Check your schema and database logs.");
      }
    }),
});