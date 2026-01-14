
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tasks, projects, projectCollaborators, taskActivityLog, organizationMembers, users, organizations } from "~/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const taskRouter = createTRPCRouter({
 
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
      
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      
     
      let isOrgMember = false;
      let canAssignTasks = false;
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
        canAssignTasks = membership?.canAssignTasks ?? false;
        
        // Check if user is org owner
        const [org] = await ctx.db
          .select()
          .from(organizations)
          .where(eq(organizations.id, project.organizationId));
        const isOrgOwner = org?.createdById === ctx.session.user.id;
        
        if (!isOwner && !isOrgOwner && !canAssignTasks) {
          throw new Error("Only the organization owner or authorized members can create tasks");
        }
      }

      if (!isOwner && !isOrgMember) {
       
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

      
      const existingTasks = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, input.projectId));

      const maxOrderIndex = existingTasks.length > 0
        ? Math.max(...existingTasks.map(t => t.orderIndex))
        : 0;

      
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

 
  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "blocked"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      if (!task) {
        throw new Error("Task not found");
      }

     
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      const isAssignee = task.assignedToId === ctx.session.user.id;
      
      
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

      
      if (input.status === "completed" && oldStatus !== "completed") {
        updateData.completedAt = new Date();
        updateData.completedById = ctx.session.user.id;
      }
      
      else if (input.status !== "completed" && oldStatus === "completed") {
        updateData.completedAt = null;
        updateData.completedById = null;
      }

      await ctx.db
        .update(tasks)
        .set(updateData)
        .where(eq(tasks.id, input.taskId));

      
      await ctx.db.insert(taskActivityLog).values({
        taskId: input.taskId,
        userId: ctx.session.user.id,
        action: "status_changed",
        oldValue: oldStatus,
        newValue: input.status,
      });

      return { success: true };
    }),

  
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
      
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      if (!task) {
        throw new Error("Task not found");
      }

     
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      
      
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

     
      await ctx.db.insert(taskActivityLog).values({
        taskId: input.taskId,
        userId: ctx.session.user.id,
        action: "updated",
        newValue: "Task updated",
      });

      return { success: true };
    }),

  
  delete: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ ctx, input }) => {
     
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(eq(tasks.id, input.taskId));

      if (!task) {
        throw new Error("Task not found");
      }

     
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, task.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;
      
      
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

  getProjectActivity: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      if (!project) {
        throw new Error("Project not found");
      }

      const isOwner = project.createdById === ctx.session.user.id;

      let hasOrgAccess = false;
      if (project.organizationId) {
        const [membership] = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, project.organizationId),
              eq(organizationMembers.userId, ctx.session.user.id)
            )
          )
          .limit(1);
        hasOrgAccess = !!membership;
      }

      const [collaboration] = await ctx.db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, input.projectId),
            eq(projectCollaborators.collaboratorId, ctx.session.user.id)
          )
        )
        .limit(1);

      if (!isOwner && !hasOrgAccess && !collaboration) {
        throw new Error("Access denied - You don't have permission to view this project");
      }

      const limit = input.limit ?? 25;

      const rows = await ctx.db
        .select({
          id: taskActivityLog.id,
          taskId: taskActivityLog.taskId,
          action: taskActivityLog.action,
          oldValue: taskActivityLog.oldValue,
          newValue: taskActivityLog.newValue,
          createdAt: taskActivityLog.createdAt,
          taskTitle: tasks.title,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          },
        })
        .from(taskActivityLog)
        .innerJoin(tasks, eq(taskActivityLog.taskId, tasks.id))
        .leftJoin(users, eq(taskActivityLog.userId, users.id))
        .where(eq(tasks.projectId, input.projectId))
        .orderBy(desc(taskActivityLog.createdAt))
        .limit(limit);

      return rows;
    }),

  getOrgActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional(),
        scope: z.enum(["personal", "organization", "all"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const limit = input.limit ?? 50;
      const scope = input.scope ?? "organization";

      // Get active organization
      let activeOrganizationId: number | null = null;
      try {
        const [userRow] = await ctx.db
          .select({ activeOrganizationId: users.activeOrganizationId })
          .from(users)
          .where(eq(users.id, ctx.session.user.id))
          .limit(1);
        activeOrganizationId = userRow?.activeOrganizationId ?? null;
      } catch (err) {
        activeOrganizationId = null;
      }

      // Get all organizations the user is a member of
      const memberships = await ctx.db
        .select({ organizationId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, ctx.session.user.id));

      const orgIds = memberships.map((m) => m.organizationId);

      let whereCondition;
      let returnScope: "personal" | "organization" | "all";

      if (scope === "all" && orgIds.length > 0) {
        // All organizations + personal projects
        whereCondition = sql`(${projects.organizationId} IN ${orgIds} OR (${projects.createdById} = ${ctx.session.user.id} AND ${projects.organizationId} IS NULL))`;
        returnScope = "all";
      } else if (scope === "organization" && activeOrganizationId && orgIds.includes(activeOrganizationId)) {
        // Active organization
        whereCondition = eq(projects.organizationId, activeOrganizationId);
        returnScope = "organization";
      } else {
        // Personal only
        whereCondition = eq(taskActivityLog.userId, ctx.session.user.id);
        returnScope = "personal";
      }

      const rows = await ctx.db
        .select({
          id: taskActivityLog.id,
          taskId: taskActivityLog.taskId,
          action: taskActivityLog.action,
          oldValue: taskActivityLog.oldValue,
          newValue: taskActivityLog.newValue,
          createdAt: taskActivityLog.createdAt,
          taskTitle: tasks.title,
          projectId: tasks.projectId,
          projectTitle: projects.title,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          },
        })
        .from(taskActivityLog)
        .innerJoin(tasks, eq(taskActivityLog.taskId, tasks.id))
        .innerJoin(projects, eq(tasks.projectId, projects.id))
        .leftJoin(users, eq(taskActivityLog.userId, users.id))
        .where(whereCondition)
        .orderBy(desc(taskActivityLog.createdAt))
        .limit(limit);

      return { scope: returnScope, rows };
    }),
});