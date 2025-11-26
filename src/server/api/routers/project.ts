// src/server/api/routers/project.ts - FIXED TypeScript Issues

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, tasks, projectCollaborators, users, organizationMembers, notifications } from "~/server/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";

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
      // Get user's organization if they have one
      const [membership] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, ctx.session.user.id))
        .limit(1);

      console.log("🔍 Creating project - User ID:", ctx.session.user.id);
      console.log("🔍 User's organization membership:", membership);

      const [project] = await ctx.db
        .insert(projects)
        .values({
          title: input.title,
          description: input.description ?? "",
          createdById: ctx.session.user.id,
          shareStatus: input.shareStatus,
          organizationId: membership?.organizationId ?? null,
        })
        .returning();

      console.log("✅ Created project:", {
        id: project?.id,
        title: project?.title,
        organizationId: project?.organizationId,
      });

      return project;
    }),

  // Get all projects the user has access to
  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    console.log("🔍 Fetching projects for user:", ctx.session.user.id);

    // Check if user is in an organization
    const [membership] = await ctx.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, ctx.session.user.id))
      .limit(1);

    console.log("🔍 User organization membership:", membership);

    if (membership) {
      // User is in an organization - show ALL organization projects
      const orgProjects = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, membership.organizationId))
        .orderBy(desc(projects.createdAt));

      console.log("📦 Found organization projects:", orgProjects.length);
      console.log("📦 Projects:", orgProjects.map(p => ({
        id: p.id,
        title: p.title,
        organizationId: p.organizationId,
        createdById: p.createdById,
      })));

      return orgProjects;
    } else {
      // User is in personal mode - show only their own projects
      const myProjects = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.createdById, ctx.session.user.id),
            isNull(projects.organizationId)
          )
        )
        .orderBy(desc(projects.createdAt));

      console.log("📦 Found personal projects:", myProjects.length);

      return myProjects;
    }
  }),

  // Get project by ID with all details INCLUDING task creator, completer, and last editor
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

      console.log("🔍 Fetching project:", {
        id: project.id,
        organizationId: project.organizationId,
        createdById: project.createdById,
      });

      // Check if user has access
      const isOwner = project.createdById === ctx.session.user.id;
      
      // Check if user is in the same organization (org members have write access)
      let hasOrgAccess = false;
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
        hasOrgAccess = !!membership;
        isOrgMember = !!membership;
        console.log("🔍 User has org access:", hasOrgAccess, "via membership:", !!membership);
      }

      // Check if user is a collaborator
      const [collaboration] = await ctx.db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, input.id),
            eq(projectCollaborators.collaboratorId, ctx.session.user.id)
          )
        );

      console.log("🔍 Access check:", { isOwner, hasOrgAccess, isCollaborator: !!collaboration });

      if (!isOwner && !collaboration && !hasOrgAccess) {
        throw new Error("Access denied - You don't have permission to view this project");
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

      // Get all tasks with user information using SQL aliases
      // This is the fix - use sql`` to create proper aliases
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
          lastEditedAt: tasks.lastEditedAt,
          // Assigned user
          assignedToId: tasks.assignedToId,
          assignedToName: sql<string | null>`assigned_user.name`.as('assignedToName'),
          assignedToImage: sql<string | null>`assigned_user.image`.as('assignedToImage'),
          // Creator user
          createdById: tasks.createdById,
          createdByName: sql<string | null>`creator_user.name`.as('createdByName'),
          createdByImage: sql<string | null>`creator_user.image`.as('createdByImage'),
          // Completer user
          completedById: tasks.completedById,
          completedByName: sql<string | null>`completer_user.name`.as('completedByName'),
          completedByImage: sql<string | null>`completer_user.image`.as('completedByImage'),
          // Editor user
          lastEditedById: tasks.lastEditedById,
          lastEditedByName: sql<string | null>`editor_user.name`.as('lastEditedByName'),
          lastEditedByImage: sql<string | null>`editor_user.image`.as('lastEditedByImage'),
        })
        .from(tasks)
        .leftJoin(sql`app_user AS assigned_user`, sql`${tasks.assignedToId} = assigned_user.id`)
        .leftJoin(sql`app_user AS creator_user`, sql`${tasks.createdById} = creator_user.id`)
        .leftJoin(sql`app_user AS completer_user`, sql`${tasks.completedById} = completer_user.id`)
        .leftJoin(sql`app_user AS editor_user`, sql`${tasks.lastEditedById} = editor_user.id`)
        .where(eq(tasks.projectId, input.id))
        .orderBy(tasks.orderIndex, tasks.createdAt);

      // Transform the flat result into nested objects
      const formattedTasks = projectTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        orderIndex: task.orderIndex,
        createdAt: task.createdAt,
        lastEditedAt: task.lastEditedAt,
        assignedTo: task.assignedToId
          ? {
              id: task.assignedToId,
              name: task.assignedToName,
              image: task.assignedToImage,
            }
          : null,
        createdBy: task.createdById
          ? {
              id: task.createdById,
              name: task.createdByName,
              image: task.createdByImage,
            }
          : null,
        completedBy: task.completedById
          ? {
              id: task.completedById,
              name: task.completedByName,
              image: task.completedByImage,
            }
          : null,
        lastEditedBy: task.lastEditedById
          ? {
              id: task.lastEditedById,
              name: task.lastEditedByName,
              image: task.lastEditedByImage,
            }
          : null,
      }));

      console.log("📋 Project tasks:", formattedTasks.length);

      // Determine if user has write access:
      // - Owner always has write access
      // - Org members have write access
      // - Collaborators have write access if permission is "write"
      const hasWriteAccess = isOwner || isOrgMember || (collaboration?.permission === "write");

      return {
        ...project,
        collaborators,
        tasks: formattedTasks,
        userHasWriteAccess: hasWriteAccess,
      };
    }),

  // Add a collaborator to a project
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

        // Get the owner's info for the notification
        const [owner] = await ctx.db
          .select({
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, ctx.session.user.id))
          .limit(1);

        // Find user by email
        const [userToAdd] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, input.email));

        if (!userToAdd) {
          throw new Error(`No user found with email: ${input.email}. They must sign up first!`);
        }

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

        // Add collaborator
        await ctx.db.insert(projectCollaborators).values({
          projectId: input.projectId,
          collaboratorId: userToAdd.id,
          permission: input.permission,
        });

        // CREATE IN-APP NOTIFICATION with correct link to the project
        const ownerName = owner?.name ?? owner?.email ?? "Someone";
        const permissionText = input.permission === "write" ? "edit" : "view";
        
        console.log("📬 Creating notification for user:", userToAdd.id);
        
        // Create a link that opens the specific project
        const projectLink = `/create?action=new_project&projectId=${input.projectId}`;
        
        const [notification] = await ctx.db.insert(notifications).values({
          userId: userToAdd.id,
          type: "project",
          title: "New Project Invitation",
          message: `${ownerName} invited you to ${permissionText} "${project.title}"`,
          link: projectLink,
          read: false,
        }).returning();

        console.log("✅ Notification created:", notification);

        return { 
          success: true,
          message: `Successfully added ${userToAdd.name ?? input.email} as a collaborator!`,
          user: {
            id: userToAdd.id,
            name: userToAdd.name,
            email: userToAdd.email,
            image: userToAdd.image,
          }
        };
      } catch (error) {
        console.error("❌ Error adding collaborator:", error);
        
        if (error instanceof Error) {
          throw new Error(error.message);
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