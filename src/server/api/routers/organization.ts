// src/server/api/routers/organization.ts (DRIZZLE VERSION - NO WARNINGS)

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { organizations, organizationMembers, users, tasks, projects, documents } from "~/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Helper function to generate unique access code
function generateAccessCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code; // Format: XXXX-XXXX-XXXX
}

export const organizationRouter = createTRPCRouter({
  // Create new organization (Admin)
  create: protectedProcedure
    .input(z.object({ 
      name: z.string().min(1).max(100) 
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already has an organization
      const existingMembership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

      if (existingMembership) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "You are already part of an organization" 
        });
      }

      // Generate unique access code
      let accessCode: string;
      let isUnique = false;
      
      do {
        accessCode = generateAccessCode();
        const existing = await ctx.db.query.organizations.findFirst({
          where: eq(organizations.accessCode, accessCode),
        });
        isUnique = !existing;
      } while (!isUnique);

      // Create organization
      const newOrgs = await ctx.db.insert(organizations).values({
        name: input.name,
        accessCode,
        createdById: ctx.session.user.id,
      }).returning();

      const organization = newOrgs[0];
      if (!organization) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create organization" });
      }

      // Add creator as admin member
      await ctx.db.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: ctx.session.user.id,
        role: "admin",
      });

      // Update user mode
      await ctx.db.update(users)
        .set({ usageMode: "organization" })
        .where(eq(users.id, ctx.session.user.id));

      return { 
        organizationId: organization.id,
        accessCode: organization.accessCode 
      };
    }),

  // Join existing organization (Worker)
  join: protectedProcedure
    .input(z.object({ 
      code: z.string().min(1) 
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already in an organization
      const existingMembership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

      if (existingMembership) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "You are already part of an organization" 
        });
      }

      // Find organization by access code
      const organization = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.accessCode, input.code),
      });

      if (!organization) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Invalid access code" 
        });
      }

      // Add user as worker
      await ctx.db.insert(organizationMembers).values({
        organizationId: organization.id,
        userId: ctx.session.user.id,
        role: "worker",
      });

      // Update user mode
      await ctx.db.update(users)
        .set({ usageMode: "organization" })
        .where(eq(users.id, ctx.session.user.id));

      return { 
        success: true,
        organizationId: organization.id,
        organizationName: organization.name 
      };
    }),

  // Get current user's organization
  getMyOrganization: protectedProcedure
    .query(async ({ ctx }) => {
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
        with: {
          organization: {
            with: {
              members: {
                with: {
                  user: true,
                },
              },
            },
          },
        },
      });

      if (!membership) {
        return null;
      }

      // Get counts
      const projectCountResult = await ctx.db.select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.organizationId, membership.organization.id));

      const documentCountResult = await ctx.db.select({ count: sql<number>`count(*)` })
        .from(documents)
        .where(eq(documents.organizationId, membership.organization.id));

      return {
        organizationId: membership.organization.id,
        organizationName: membership.organization.name,
        accessCode: membership.organization.accessCode,
        role: membership.role,
        joinedAt: membership.joinedAt,
        members: membership.organization.members,
        stats: {
          projects: projectCountResult?.[0]?.count ?? 0,
          documents: documentCountResult?.[0]?.count ?? 0,
        },
      };
    }),

  // Get tasks due count for current user
  getTasksDueCount: protectedProcedure
    .query(async ({ ctx }) => {
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

      if (!membership) {
        return 0;
      }

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const result = await ctx.db.select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(
          and(
            eq(tasks.assignedToId, ctx.session.user.id),
            sql`${tasks.status} IN ('pending', 'in_progress')`,
            sql`${tasks.dueDate} <= ${sevenDaysFromNow}`
          )
        );

      return result[0]?.count ?? 0;
    }),

  // Update member role (Admin only)
  updateMemberRole: protectedProcedure
    .input(z.object({
      memberId: z.number(),
      role: z.enum(["admin", "worker"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if requester is admin
      const requesterMembership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

     if (requesterMembership?.role !== "admin") {
        throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Only admins can update roles" 
    });
}

      // Update member role
      await ctx.db.update(organizationMembers)
        .set({ role: input.role })
        .where(eq(organizationMembers.id, input.memberId));

      return { success: true };
    }),

  // Remove member (Admin only)
  removeMember: protectedProcedure
    .input(z.object({
      memberId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if requester is admin
      const requesterMembership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

      if (requesterMembership?.role !== "admin") {
         throw new TRPCError({ 
        code: "FORBIDDEN", 
        message: "Only admins can remove members" 
    });
}

      const memberToRemove = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.id, input.memberId),
      });

      if (!memberToRemove) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      }

      // Can't remove yourself
      if (memberToRemove.userId === ctx.session.user.id) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "Cannot remove yourself" 
        });
      }

      // Delete membership
      await ctx.db.delete(organizationMembers)
        .where(eq(organizationMembers.id, input.memberId));

      // Update removed user's mode back to null
      await ctx.db.update(users)
        .set({ usageMode: null })
        .where(eq(users.id, memberToRemove.userId));

      return { success: true };
    }),

  // Leave organization
  leaveOrganization: protectedProcedure
    .mutation(async ({ ctx }) => {
      const membership = await ctx.db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, ctx.session.user.id),
      });

      if (!membership) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "You are not in an organization" 
        });
      }

      // Check if last admin
      if (membership.role === "admin") {
        const adminCountResult = await ctx.db.select({ count: sql<number>`count(*)` })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, membership.organizationId),
              eq(organizationMembers.role, "admin")
            )
          );

        const adminCount = adminCountResult?.[0]?.count ?? 0;
        
        if (adminCount === 1) {
          throw new TRPCError({ 
            code: "BAD_REQUEST", 
            message: "Cannot leave as the last admin. Transfer admin rights first." 
          });
        }
      }

      // Delete membership
      await ctx.db.delete(organizationMembers)
        .where(eq(organizationMembers.id, membership.id));

      // Update user mode
      await ctx.db.update(users)
        .set({ usageMode: null })
        .where(eq(users.id, ctx.session.user.id));

      return { success: true };
    }),
});