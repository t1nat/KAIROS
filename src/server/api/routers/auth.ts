import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { users, passwordResetCodes } from "~/server/db/schema";
import { eq, and, gt } from "drizzle-orm";
import * as argon2 from "argon2";
import { TRPCError } from "@trpc/server";
import { sendWelcomeEmail, sendPasswordResetCode } from "~/server/email";
import crypto from "node:crypto";

function generateResetCode(): string {
  const buf = crypto.randomBytes(4);
  const num = buf.readUInt32BE(0) % 90000000 + 10000000;
  return num.toString();
}

export const authRouter = createTRPCRouter({
  signup: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, password, name } = input;

      const existingUser = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      const [newUser] = await ctx.db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          name: name ?? null,
          emailVerified: new Date(),
        })
        .returning();

      // Send welcome email (fire-and-forget, don't block signup)
      void sendWelcomeEmail({
        email,
        userName: name ?? email,
      }).catch((err) => {
        console.error("Failed to send welcome email to:", email, err);
      });

      return {
        success: true,
        userId: newUser?.id,
      };
    }),

  requestPasswordReset: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email } = input;

      // Always return success to prevent email enumeration
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        // Don't reveal that the user doesn't exist
        return { success: true };
      }

      const code = generateResetCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the code in the database
      await ctx.db.insert(passwordResetCodes).values({
        email,
        code,
        expiresAt,
      });

      // Send the code via email
      try {
        await sendPasswordResetCode({
          email,
          userName: user.name ?? email,
          code,
        });
      } catch (err) {
        console.error("Failed to send password reset code:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send reset code. Please try again.",
        });
      }

      return { success: true };
    }),

  verifyResetCode: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, code } = input;

      const resetCode = await ctx.db.query.passwordResetCodes.findFirst({
        where: and(
          eq(passwordResetCodes.email, email),
          eq(passwordResetCodes.code, code),
          eq(passwordResetCodes.used, false),
          gt(passwordResetCodes.expiresAt, new Date()),
        ),
      });

      if (!resetCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset code",
        });
      }

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        code: z.string().length(8),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, code, newPassword } = input;

      // Verify the code again
      const resetCode = await ctx.db.query.passwordResetCodes.findFirst({
        where: and(
          eq(passwordResetCodes.email, email),
          eq(passwordResetCodes.code, code),
          eq(passwordResetCodes.used, false),
          gt(passwordResetCodes.expiresAt, new Date()),
        ),
      });

      if (!resetCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset code",
        });
      }

      const user = await ctx.db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const hashedPassword = await argon2.hash(newPassword, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });

      // Update password and mark code as used
      await ctx.db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.email, email));

      await ctx.db
        .update(passwordResetCodes)
        .set({ used: true })
        .where(eq(passwordResetCodes.id, resetCode.id));

      return { success: true };
    }),
});