// src/server/api/routers/project.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, tasks, projectCollaborators, users } from "~/server/db/schema";
import { eq, and, or, desc } from "drizzle-orm";

export const projectRouter = createTRPCRouter({
  // Create a new project
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        shareStatus: z.enum(["private", "shared_read", "shared_write"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .insert(projects)
        .values({
          title: input.title,
          description: input.description ?? "",
          createdById: ctx.session.user.id,
          shareStatus: input.shareStatus,
        })
        .returning();

      return project;
    }),

  // Get all projects the user owns or collaborates on
  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    const myProjects = await ctx.db
      .select()
      .from(projects)
      .where(
        or(
          eq(projects.createdById, ctx.session.user.id),
          // Also get projects where user is a collaborator
          // This would need a more complex query with joins
        )
      )
      .orderBy(desc(projects.createdAt));

    return myProjects;
  }),

  // Get project by ID with all details
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      // Get the project
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));

      if (!project) {
        throw new Error("Project not found");
      }

      // Check if user has access (owner or collaborator)
      const isOwner = project.createdById === ctx.session.user.id;
      
      const [collaboration] = await ctx.db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, input.id),
            eq(projectCollaborators.collaboratorId, ctx.session.user.id)
          )
        );

      if (!isOwner && !collaboration) {
        throw new Error("Access denied");
      }

      // Get all collaborators
      const collaborators = await ctx.db
        .select({
          collaboratorId: projectCollaborators.collaboratorId,
          permission: projectCollaborators.permission,
          joinedAt: projectCollaborators.joinedAt,
          collaborator: {
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          },
        })
        .from(projectCollaborators)
        .leftJoin(users, eq(projectCollaborators.collaboratorId, users.id))
        .where(eq(projectCollaborators.projectId, input.id));

      // Get all tasks for this project
      const projectTasks = await ctx.db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          completedAt: tasks.completedAt,
          orderIndex: tasks.orderIndex,
          createdAt: tasks.createdAt,
          assignedTo: {
            id: users.id,
            name: users.name,
            image: users.image,
          },
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assignedToId, users.id))
        .where(eq(tasks.projectId, input.id))
        .orderBy(tasks.orderIndex, tasks.createdAt);

      return {
        ...project,
        collaborators,
        tasks: projectTasks,
      };
    }),

  // Add a collaborator to a project - IMPROVED VERSION
  addCollaborator: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        email: z.string().email(),
        permission: z.enum(["read", "write"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("🔍 Adding collaborator:", input);

        // Verify user is the project owner
        const [project] = await ctx.db
          .select()
          .from(projects)
          .where(eq(projects.id, input.projectId));

        if (!project) {
          throw new Error("Project not found. Please refresh and try again.");
        }

        if (project.createdById !== ctx.session.user.id) {
          throw new Error("Only the project owner can add collaborators.");
        }

        console.log("✅ User is project owner");

        // Find user by email
        const [userToAdd] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, input.email));

        if (!userToAdd) {
          throw new Error(`No user found with email: ${input.email}. They must sign up first!`);
        }

        console.log("✅ User found:", userToAdd.email);

        // Check if trying to add themselves
        if (userToAdd.id === ctx.session.user.id) {
          throw new Error("You can't add yourself as a collaborator - you're already the owner!");
        }

        // Check if already a collaborator
        const [existing] = await ctx.db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, input.projectId),
              eq(projectCollaborators.collaboratorId, userToAdd.id)
            )
          );

        if (existing) {
          throw new Error(`${input.email} is already a collaborator on this project.`);
        }

        console.log("✅ Adding to database...");

        // Add collaborator
        await ctx.db.insert(projectCollaborators).values({
          projectId: input.projectId,
          collaboratorId: userToAdd.id,
          permission: input.permission,
        });

        console.log("✅ Collaborator added successfully!");

        return { 
          success: true,
          message: `Successfully added ${userToAdd.name ?? input.email} as a collaborator!`
        };
      } catch (error) {
        console.error("❌ Error adding collaborator:", error);
        
        // Re-throw with better error message
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Failed to add collaborator. Please try again.");
      }
    }),

  // Remove a collaborator
  removeCollaborator: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        collaboratorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is the project owner
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project || project.createdById !== ctx.session.user.id) {
        throw new Error("Only project owner can remove collaborators");
      }

      await ctx.db
        .delete(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, input.projectId),
            eq(projectCollaborators.collaboratorId, input.collaboratorId)
          )
        );

      return { success: true };
    }),

  // Update collaborator permission
  updateCollaboratorPermission: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        collaboratorId: z.string(),
        permission: z.enum(["read", "write"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is the project owner
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project || project.createdById !== ctx.session.user.id) {
        throw new Error("Only project owner can update permissions");
      }

      await ctx.db
        .update(projectCollaborators)
        .set({ permission: input.permission })
        .where(
          and(
            eq(projectCollaborators.projectId, input.projectId),
            eq(projectCollaborators.collaboratorId, input.collaboratorId)
          )
        );

      return { success: true };
    }),
});