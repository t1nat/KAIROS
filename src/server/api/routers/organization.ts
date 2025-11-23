// src/server/api/routers/organization.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { organizations, organizationMembers, users } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

// Helper function to generate access code
function generateAccessCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const organizationRouter = createTRPCRouter({
  // Create a new organization (Admin)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Generate unique access code
        let accessCode = generateAccessCode();
        let isUnique = false;
        
        // Ensure access code is unique
        while (!isUnique) {
          const [existing] = await ctx.db
            .select()
            .from(organizations)
            .where(eq(organizations.accessCode, accessCode))
            .limit(1);
          
          if (!existing) {
            isUnique = true;
          } else {
            accessCode = generateAccessCode();
          }
        }

        // Create the organization
        const [organization] = await ctx.db
          .insert(organizations)
          .values({
            name: input.name,
            accessCode: accessCode,
            createdById: ctx.session.user.id,
          })
          .returning();

        if (!organization) {
          throw new Error("Failed to create organization");
        }

        // Add creator as admin member
        await ctx.db.insert(organizationMembers).values({
          organizationId: organization.id,
          userId: ctx.session.user.id,
          role: "admin",
        });

        // Update user's usage mode to organization
        await ctx.db
          .update(users)
          .set({ usageMode: "organization" })
          .where(eq(users.id, ctx.session.user.id));

        return {
          id: organization.id,
          name: organization.name,
          accessCode: organization.accessCode,
        };
      } catch (error) {
        console.error("Error creating organization:", error);
        throw new Error("Failed to create organization");
      }
    }),

  // Join an organization (Worker)
  join: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Find organization by access code
        const [organization] = await ctx.db
          .select()
          .from(organizations)
          .where(eq(organizations.accessCode, input.code.toUpperCase()));

        if (!organization) {
          throw new Error("Invalid access code. Please check and try again.");
        }

        // Check if user is already a member
        const [existingMember] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, organization.id),
              eq(organizationMembers.userId, ctx.session.user.id)
            )
          );

        if (existingMember) {
          throw new Error("You are already a member of this organization.");
        }

        // Add user as worker member
        await ctx.db.insert(organizationMembers).values({
          organizationId: organization.id,
          userId: ctx.session.user.id,
          role: "worker",
        });

        // Update user's usage mode to organization
        await ctx.db
          .update(users)
          .set({ usageMode: "organization" })
          .where(eq(users.id, ctx.session.user.id));

        return {
          success: true,
          organizationName: organization.name,
        };
      } catch (error) {
        console.error("Error joining organization:", error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to join organization");
      }
    }),

  // Get current user's organization
  getMy: protectedProcedure.query(async ({ ctx }) => {
    const [membership] = await ctx.db
      .select({
        organization: organizations,
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id)
      )
      .where(eq(organizationMembers.userId, ctx.session.user.id))
      .limit(1);

    if (!membership) {
      return null;
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      accessCode: membership.organization.accessCode,
      role: membership.role,
      createdAt: membership.organization.createdAt,
    };
  }),

  // Get organization members
  getMembers: protectedProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify user is a member of this organization
      const [membership] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, input.organizationId),
            eq(organizationMembers.userId, ctx.session.user.id)
          )
        );

      if (!membership) {
        throw new Error("You are not a member of this organization");
      }

      // Get all members
      const members = await ctx.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: organizationMembers.role,
          joinedAt: organizationMembers.joinedAt,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(organizationMembers.userId, users.id))
        .where(eq(organizationMembers.organizationId, input.organizationId));

      return members;
    }),

  // Leave organization
  leave: protectedProcedure.mutation(async ({ ctx }) => {
    // Get user's membership
    const [membership] = await ctx.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, ctx.session.user.id));

    if (!membership) {
      throw new Error("You are not a member of any organization");
    }

    // Check if user is the only admin
    if (membership.role === "admin") {
      const [organization] = await ctx.db
        .select()
        .from(organizations)
        .where(eq(organizations.id, membership.organizationId));

      if (organization?.createdById === ctx.session.user.id) {
        // Count other admins
        const admins = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, membership.organizationId),
              eq(organizationMembers.role, "admin")
            )
          );

        if (admins.length === 1) {
          throw new Error(
            "You cannot leave as you are the only admin. Please transfer ownership or delete the organization."
          );
        }
      }
    }

    // Remove membership
    await ctx.db
      .delete(organizationMembers)
      .where(eq(organizationMembers.userId, ctx.session.user.id));

    // Set user back to personal mode
    await ctx.db
      .update(users)
      .set({ usageMode: "personal" })
      .where(eq(users.id, ctx.session.user.id));

    return { success: true };
  }),
});