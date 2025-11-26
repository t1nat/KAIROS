// src/server/api/routers/task.ts - UPDATED WITH COMPLETION AND EDIT TRACKING
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tasks, projects, projectCollaborators, taskActivityLog, organizationMembers } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export const taskRouter = createTRPCRouter({
  // Create a new task
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        assignedToId: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]),
        dueDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has write access to the project
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      
      // Check if user is in the same organization
      let isOrgMember = false;
      if (project.organizationId) {
        const [membership] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, ctx.session.user.id)
            )
          );
        isOrgMember = !!membership;
      }

      if (!isOwner && !isOrgMember) {
        // Check if user is a collaborator with write permission
        const [collaboration] = await ctx.db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, input.projectId),
              eq(projectCollaborators.collaboratorId, ctx.session.user.id),
              eq(projectCollaborators.permission, "write")
            )
          );

        if (!collaboration) {
          throw new Error("You don't have permission to create tasks in this project");
        }
      }

      // Get the highest orderIndex for this project
      const existingTasks = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, input.projectId));

      const maxOrderIndex = existingTasks.length > 0
        ? Math.max(...existingTasks.map(t => t.orderIndex))
        : 0;

      // Create the task
      const [task] = await ctx.db
        .insert(tasks)
        .values({
          projectId: input.projectId,
          title: input.title,
          description: input.description ?? "",
          assignedToId: input.assignedToId,
          priority: input.priority,
          dueDate: input.dueDate,
          status: "pending",
          createdById: ctx.session.user.id,
          orderIndex: maxOrderIndex + 1,
        })
        .returning();

      // Log the activity
      if (task) {
        await ctx.db.insert(taskActivityLog).values({
          taskId: task.id,
          userId: ctx.session.user.id,
          action: "created",
          newValue: "Task created",
        });
      }

      return task;
    }),

  // Update task status - NOW TRACKS WHO COMPLETED IT
  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "blocked"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the task and check permissions
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      if (!task) {
        throw new Error("Task not found");
      }

      // Check if user has write access
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      const isAssignee = task.assignedToId === ctx.session.user.id;
      
      // Check if user is in the same organization
      let isOrgMember = false;
      if (project.organizationId) {
        const [membership] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, ctx.session.user.id)
            )
          );
        isOrgMember = !!membership;
      }

      if (!isOwner && !isAssignee && !isOrgMember) {
        const [collaboration] = await ctx.db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, task.projectId),
              eq(projectCollaborators.collaboratorId, ctx.session.user.id),
              eq(projectCollaborators.permission, "write")
            )
          );

        if (!collaboration) {
          throw new Error("You don't have permission to update this task");
        }
      }

      const oldStatus = task.status;
      
      const updateData: {
        status: "pending" | "in_progress" | "completed" | "blocked";
        updatedAt: Date;
        completedAt?: Date | null;
        completedById?: string | null;
        lastEditedById: string;
        lastEditedAt: Date;
      } = {
        status: input.status,
        updatedAt: new Date(),
        lastEditedById: ctx.session.user.id,
        lastEditedAt: new Date(),
      };

      // If marking as completed, set completedAt timestamp and track who completed it
      if (input.status === "completed" && oldStatus !== "completed") {
        updateData.completedAt = new Date();
        updateData.completedById = ctx.session.user.id;
      }
      // If unmarking as completed, clear completedAt and completedById
      else if (input.status !== "completed" && oldStatus === "completed") {
        updateData.completedAt = null;
        updateData.completedById = null;
      }

      await ctx.db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, input.taskId));

      // Log the activity
      await ctx.db.insert(taskActivityLog).values({
        taskId: input.taskId,
        userId: ctx.session.user.id,
        action: "status_changed",
        oldValue: oldStatus,
        newValue: input.status,
      });

      return { success: true };
    }),

  // Update task details - NOW TRACKS WHO LAST EDITED
  update: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        title: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        assignedToId: z.string().optional().nullable(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.date().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get the task and check permissions
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      if (!task) {
        throw new Error("Task not found");
      }

      // Check if user has write access
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      
      // Check if user is in the same organization
      let isOrgMember = false;
      if (project.organizationId) {
        const [membership] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, ctx.session.user.id)
            )
          );
        isOrgMember = !!membership;
      }

      if (!isOwner && !isOrgMember) {
        const [collaboration] = await ctx.db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, task.projectId),
              eq(projectCollaborators.collaboratorId, ctx.session.user.id),
              eq(projectCollaborators.permission, "write")
            )
          );

        if (!collaboration) {
          throw new Error("You don't have permission to update this task");
        }
      }

      const updateData: {
        updatedAt: Date;
        lastEditedById: string;
        lastEditedAt: Date;
        title?: string;
        description?: string;
        assignedToId?: string | null;
        priority?: "low" | "medium" | "high" | "urgent";
        dueDate?: Date | null;
      } = {
        updatedAt: new Date(),
        lastEditedById: ctx.session.user.id,
        lastEditedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.assignedToId !== undefined) updateData.assignedToId = input.assignedToId;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;

      await ctx.db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, input.taskId));

      // Log the activity
      await ctx.db.insert(taskActivityLog).values({
        taskId: input.taskId,
        userId: ctx.session.user.id,
        action: "updated",
        newValue: "Task updated",
      });

      return { success: true };
    }),

  // Delete a task
  delete: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get the task and check permissions
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      if (!task) {
        throw new Error("Task not found");
      }

      // Check if user has write access
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      
      // Check if user is in the same organization
      let isOrgMember = false;
      if (project.organizationId) {
        const [membership] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, ctx.session.user.id)
            )
          );
        isOrgMember = !!membership;
      }

      if (!isOwner && !isOrgMember) {
        const [collaboration] = await ctx.db
          .select()
          .from(projectCollaborators)
          .where(
            and(
              eq(projectCollaborators.projectId, task.projectId),
              eq(projectCollaborators.collaboratorId, ctx.session.user.id),
              eq(projectCollaborators.permission, "write")
            )
          );

        if (!collaboration) {
          throw new Error("You don't have permission to delete this task");
        }
      }

      await ctx.db.delete(tasks).where(eq(tasks.id, input.taskId));

      return { success: true };
    }),

  // Get task activity log
  getActivityLog: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      const activities = await ctx.db
        .select()
        .from(taskActivityLog)
        .where(eq(taskActivityLog.taskId, input.taskId))
        .orderBy(taskActivityLog.createdAt);

      return activities;
    }),
});