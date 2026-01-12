import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projects, tasks, projectCollaborators, users, organizationMembers, notifications } from "~/server/db/schema";
import { eq, and, desc, inArray, isNull, sql } from "drizzle-orm";

export const projectRouter = createTRPCRouter({
  
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        shareStatus: z.enum(["private", "shared_read", "shared_write"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let activeOrganizationId: number | null = null;

      try {
        const [user] = await ctx.db
          .select({ activeOrganizationId: users.activeOrganizationId })
          .from(users)
          .where(eq(users.id, ctx.session.user.id))
          .limit(1);

        activeOrganizationId = user?.activeOrganizationId ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (!message.includes("active_organization_id")) {
          throw err;
        }
        activeOrganizationId = null;
      }

      const [membership] = activeOrganizationId
        ? await ctx.db
            .select()
            .from(organizationMembers)
            .where(
              and(
                eq(organizationMembers.userId, ctx.session.user.id),
                eq(organizationMembers.organizationId, activeOrganizationId),
              ),
            )
            .limit(1)
        : [undefined];

      console.log("Creating project - User ID:", ctx.session.user.id);
      console.log("User's organization membership:", membership);

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

      console.log("Created project:", {
        id: project?.id,
        title: project?.title,
        organizationId: project?.organizationId,
      });

      return project;
    }),

 
  getMyProjects: protectedProcedure.query(async ({ ctx }) => {
    console.log("Fetching projects for user:", ctx.session.user.id);

    let activeOrganizationId: number | null = null;

    try {
      const [user] = await ctx.db
        .select({ activeOrganizationId: users.activeOrganizationId })
        .from(users)
        .where(eq(users.id, ctx.session.user.id))
        .limit(1);

      activeOrganizationId = user?.activeOrganizationId ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("active_organization_id")) {
        throw err;
      }
      activeOrganizationId = null;
    }

    const [membership] = activeOrganizationId
      ? await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.userId, ctx.session.user.id),
              eq(organizationMembers.organizationId, activeOrganizationId),
            ),
          )
          .limit(1)
      : [undefined];

    console.log("User active organization membership:", membership);

    let projectsList;

    if (membership) {
      
      projectsList = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.organizationId, membership.organizationId))
        .orderBy(desc(projects.createdAt));

      console.log("Found organization projects:", projectsList.length);
    } else {
      
      projectsList = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.createdById, ctx.session.user.id),
            isNull(projects.organizationId)
          )
        )
        .orderBy(desc(projects.createdAt));

      console.log("Found personal projects:", projectsList.length);
    }

    
    const createdByIds = Array.from(new Set(projectsList.map((p) => p.createdById)));
    const createdByUsers = createdByIds.length
      ? await ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(users)
          .where(inArray(users.id, createdByIds))
      : [];
    const createdByUserMap = new Map(createdByUsers.map((u) => [u.id, u] as const));

    const projectsWithTasks = await Promise.all(
      projectsList.map(async (project) => {
        const projectTasks = await ctx.db
          .select({
            id: tasks.id,
            status: tasks.status,
            dueDate: tasks.dueDate,
          })
          .from(tasks)
          .where(eq(tasks.projectId, project.id));

        return {
          ...project,
          createdByUser: createdByUserMap.get(project.createdById) ?? null,
          tasks: projectTasks,
        };
      })
    );


    console.log("Projects with tasks:", projectsWithTasks.map(p => ({
      id: p.id,
      title: p.title,
      tasksCount: p.tasks.length,
      completedCount: p.tasks.filter(t => t.status === 'completed').length,
    })));

    return projectsWithTasks;
  }),

  // Get all projects across all organizations the user is a member of
  getAllProjectsAcrossOrgs: protectedProcedure.query(async ({ ctx }) => {
    // Get all organizations the user is a member of
    const memberships = await ctx.db
      .select({ organizationId: organizationMembers.organizationId })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, ctx.session.user.id));

    const orgIds = memberships.map((m) => m.organizationId);

    // Get projects from all user's organizations + personal projects
    let projectsList;
    if (orgIds.length > 0) {
      projectsList = await ctx.db
        .select()
        .from(projects)
        .where(
          sql`(${projects.organizationId} IN ${orgIds} OR (${projects.createdById} = ${ctx.session.user.id} AND ${projects.organizationId} IS NULL))`
        )
        .orderBy(desc(projects.createdAt));
    } else {
      // Only personal projects
      projectsList = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.createdById, ctx.session.user.id),
            isNull(projects.organizationId)
          )
        )
        .orderBy(desc(projects.createdAt));
    }

    // Get created by users
    const createdByIds = Array.from(new Set(projectsList.map((p) => p.createdById)));
    const createdByUsers = createdByIds.length
      ? await ctx.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(users)
          .where(inArray(users.id, createdByIds))
      : [];
    const createdByUserMap = new Map(createdByUsers.map((u) => [u.id, u] as const));

    const projectsWithTasks = await Promise.all(
      projectsList.map(async (project) => {
        const projectTasks = await ctx.db
          .select({
            id: tasks.id,
            status: tasks.status,
            dueDate: tasks.dueDate,
          })
          .from(tasks)
          .where(eq(tasks.projectId, project.id));

        return {
          ...project,
          createdByUser: createdByUserMap.get(project.createdById) ?? null,
          tasks: projectTasks,
        };
      })
    );

    return projectsWithTasks;
  }),

  
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
     
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));

      if (!project) {
        throw new Error("Project not found");
      }

      console.log("Fetching project:", {
        id: project.id,
        organizationId: project.organizationId,
        createdById: project.createdById,
      });

      

      const isOwner = project.createdById === ctx.session.user.id;
      
      
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
        console.log("User has org access:", hasOrgAccess, "via membership:", !!membership);
      }

      
      const [collaboration] = await ctx.db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, input.id),
            eq(projectCollaborators.collaboratorId, ctx.session.user.id)
          )
        );

      console.log("Access check:", { isOwner, hasOrgAccess, isCollaborator: !!collaboration });

      if (!isOwner && !collaboration && !hasOrgAccess) {
        throw new Error("Access denied - You don't have permission to view this project");
      }

      
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
       
          assignedToId: tasks.assignedToId,
          assignedToName: sql<string | null>`assigned_user.name`.as('assignedToName'),
          assignedToImage: sql<string | null>`assigned_user.image`.as('assignedToImage'),
       
          createdById: tasks.createdById,
          createdByName: sql<string | null>`creator_user.name`.as('createdByName'),
          createdByImage: sql<string | null>`creator_user.image`.as('createdByImage'),
     
          completedById: tasks.completedById,
          completedByName: sql<string | null>`completer_user.name`.as('completedByName'),
          completedByImage: sql<string | null>`completer_user.image`.as('completedByImage'),
          
          lastEditedById: tasks.lastEditedById,
          lastEditedByName: sql<string | null>`editor_user.name`.as('lastEditedByName'),
          lastEditedByImage: sql<string | null>`editor_user.image`.as('lastEditedByImage'),
        })
        .from(tasks)
        .leftJoin(sql`"user" AS assigned_user`, sql`${tasks.assignedToId} = assigned_user.id`)
        .leftJoin(sql`"user" AS creator_user`, sql`${tasks.createdById} = creator_user.id`)
        .leftJoin(sql`"user" AS completer_user`, sql`${tasks.completedById} = completer_user.id`)
        .leftJoin(sql`"user" AS editor_user`, sql`${tasks.lastEditedById} = editor_user.id`)
        .where(eq(tasks.projectId, input.id))
        .orderBy(tasks.orderIndex, tasks.createdAt);

      
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

      console.log("Project tasks:", formattedTasks.length);

      
      const hasWriteAccess = isOwner || isOrgMember || (collaboration?.permission === "write");

      return {
        ...project,
        collaborators,
        tasks: formattedTasks,
        userHasWriteAccess: hasWriteAccess,
      };
    }),

  
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

        
        const [owner] = await ctx.db
          .select({
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, ctx.session.user.id))
          .limit(1);

       
        const [userToAdd] = await ctx.db
          .select()
          .from(users)
          .where(eq(users.email, input.email));

        if (!userToAdd) {
          throw new Error(`No user found with email: ${input.email}. They must sign up first!`);
        }

        
        if (userToAdd.id === ctx.session.user.id) {
          throw new Error("You can't add yourself as a collaborator - you're already the owner!");
        }

        
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

        
        await ctx.db.insert(projectCollaborators).values({
          projectId: input.projectId,
          collaboratorId: userToAdd.id,
          permission: input.permission,
        });

        
        const ownerName = owner?.name ?? owner?.email ?? "Someone";
        const permissionText = input.permission === "write" ? "edit" : "view";
        
        console.log("Creating notification for user:", userToAdd.id);
        
        
        const projectLink = `/create?action=new_project&projectId=${input.projectId}`;
        
        const [notification] = await ctx.db.insert(notifications).values({
          userId: userToAdd.id,
          type: "project",
          title: "New Project Invitation",
          message: `${ownerName} invited you to ${permissionText} "${project.title}"`,
          link: projectLink,
          read: false,
        }).returning();

        console.log("Notification created:", notification);

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
        console.error("Error adding collaborator:", error);
        
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw new Error("Failed to add collaborator. Please try again.");
      }
    }),

  
  removeCollaborator: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        collaboratorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      
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

  
  updateCollaboratorPermission: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        collaboratorId: z.string(),
        permission: z.enum(["read", "write"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      
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

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id));

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.createdById !== ctx.session.user.id) {
        throw new Error("Only the project owner can delete this project");
      }

      await ctx.db.delete(projects).where(eq(projects.id, input.id));

      return { success: true };
    }),

  archiveProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.createdById !== ctx.session.user.id) {
        throw new Error("Only the project owner can archive this project");
      }

      await ctx.db
        .update(projects)
        .set({ status: "archived" })
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),

  reopenProject: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId));

      if (!project) {
        throw new Error("Project not found");
      }

      if (project.createdById !== ctx.session.user.id) {
        throw new Error("Only the project owner can reopen this project");
      }

      await ctx.db
        .update(projects)
        .set({ status: "active" })
        .where(eq(projects.id, input.projectId));

      return { success: true };
    }),
});