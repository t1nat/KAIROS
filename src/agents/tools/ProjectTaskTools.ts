import { z } from "zod";
import { and, desc, eq, isNull, inArray, sql } from "drizzle-orm";

import { projects, tasks, projectCollaborators, organizationMembers, organizations, users, taskActivityLog } from "~/server/db/schema";
import type { ToolDefinition, ToolRegistry, ToolCallContext } from "../core/ToolDefinition";

// --------------------
// Shared DTOs
// --------------------

export const ProjectOverviewSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  shareStatus: z.string(),
  organizationId: z.number().nullable(),
  createdById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date().nullable(),
  collaborators: z.array(
    z.object({
      collaboratorId: z.string(),
      permission: z.enum(["read", "write"]),
      joinedAt: z.date(),
      collaborator: z.object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string().nullable(),
        image: z.string().nullable(),
      }),
    }),
  ),
  createdBy: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
      image: z.string().nullable(),
    })
    .nullable(),
  userHasWriteAccess: z.boolean(),
});

export type ProjectOverview = z.infer<typeof ProjectOverviewSchema>;

export const ProjectTaskSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["pending", "in_progress", "completed", "blocked"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.date().nullable(),
  completedAt: z.date().nullable(),
  orderIndex: z.number(),
  createdAt: z.date(),
  lastEditedAt: z.date().nullable(),
  assignedToId: z.string().nullable(),
  createdById: z.string(),
});

export type ProjectTaskSummary = z.infer<typeof ProjectTaskSummarySchema>;

// --------------------
// Tool: GetProjectOverview
// --------------------

const GetProjectOverviewInputSchema = z.object({
  projectId: z.number().int().positive(),
});

export type GetProjectOverviewInput = z.infer<typeof GetProjectOverviewInputSchema>;

export type GetProjectOverviewResult = ProjectOverview;

export const GetProjectOverviewTool: ToolDefinition<
  GetProjectOverviewInput,
  GetProjectOverviewResult
> = {
  name: "project.getOverview",
  description:
    "Fetch a single project with collaborators and access information, enforcing the same permissions as the project.getById endpoint.",
  inputSchema: GetProjectOverviewInputSchema,
  async execute(ctx: ToolCallContext, args: GetProjectOverviewInput): Promise<GetProjectOverviewResult> {
    const { db, sessionUserId } = ctx;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, args.projectId));

    if (!project) {
      throw new Error("Project not found");
    }

    const isOwner = project.createdById === sessionUserId;

    let hasOrgAccess = false;
    let isOrgMember = false;
    if (project.organizationId) {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, project.organizationId),
            eq(organizationMembers.userId, sessionUserId),
          ),
        );

      hasOrgAccess = !!membership;
      isOrgMember = !!membership;
    }

    const [collaboration] = await db
      .select()
      .from(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, args.projectId),
          eq(projectCollaborators.collaboratorId, sessionUserId),
        ),
      );

    if (!isOwner && !collaboration && !hasOrgAccess) {
      throw new Error("Access denied - You don't have permission to view this project");
    }

    const collaborators = await db
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
      .where(eq(projectCollaborators.projectId, args.projectId));

    const [createdBy] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, project.createdById));

    const hasWriteAccess = isOwner || isOrgMember || collaboration?.permission === "write";

    const rawResult = {
      ...project,
      collaborators,
      createdBy: createdBy ?? null,
      userHasWriteAccess: hasWriteAccess,
    };

    return ProjectOverviewSchema.parse(rawResult);
  },
};

// --------------------
// Tool: GetProjectTasks
// --------------------

const GetProjectTasksInputSchema = z.object({
  projectId: z.number().int().positive(),
});

export type GetProjectTasksInput = z.infer<typeof GetProjectTasksInputSchema>;

export interface GetProjectTasksResult {
  projectId: number;
  tasks: ProjectTaskSummary[];
}

export const GetProjectTasksTool: ToolDefinition<
  GetProjectTasksInput,
  GetProjectTasksResult
> = {
  name: "project.getTasks",
  description:
    "Fetch all tasks for a project that the current user has access to, ordered by orderIndex then createdAt.",
  inputSchema: GetProjectTasksInputSchema,
  async execute(ctx: ToolCallContext, args: GetProjectTasksInput): Promise<GetProjectTasksResult> {
    const { db, sessionUserId } = ctx;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, args.projectId));

    if (!project) {
      throw new Error("Project not found");
    }

    const isOwner = project.createdById === sessionUserId;

    let hasOrgAccess = false;
    if (project.organizationId) {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, project.organizationId),
            eq(organizationMembers.userId, sessionUserId),
          ),
        );
      hasOrgAccess = !!membership;
    }

    const [collaboration] = await db
      .select()
      .from(projectCollaborators)
      .where(
        and(
          eq(projectCollaborators.projectId, args.projectId),
          eq(projectCollaborators.collaboratorId, sessionUserId),
        ),
      );

    if (!isOwner && !hasOrgAccess && !collaboration) {
      throw new Error("Access denied - You don't have permission to view tasks for this project");
    }

    const projectTasks = await db
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
        createdById: tasks.createdById,
      })
      .from(tasks)
      .where(eq(tasks.projectId, args.projectId))
      .orderBy(tasks.orderIndex, tasks.createdAt);

    const tasksParsed = z.array(ProjectTaskSummarySchema).parse(projectTasks);

    return { projectId: args.projectId, tasks: tasksParsed };
  },
};

// --------------------
// Tool: CreateTasksBatch
// --------------------

const CreateTasksBatchInputSchema = z.object({
  projectId: z.number().int().positive(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(256),
        description: z.string().optional(),
        assignedToId: z.string().optional().nullable(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
        dueDate: z.string().datetime().optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export type CreateTasksBatchInput = z.infer<typeof CreateTasksBatchInputSchema>;

export interface CreateTasksBatchResult {
  projectId: number;
  createdTaskIds: number[];
}

export const CreateTasksBatchTool: ToolDefinition<
  CreateTasksBatchInput,
  CreateTasksBatchResult
> = {
  name: "task.createBatch",
  description:
    "Create multiple tasks in a single project, reusing the same permission and ordering rules as the task.create endpoint.",
  inputSchema: CreateTasksBatchInputSchema,
  async execute(ctx: ToolCallContext, args: CreateTasksBatchInput): Promise<CreateTasksBatchResult> {
    const { db, sessionUserId } = ctx;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, args.projectId));

    if (!project) {
      throw new Error("Project not found");
    }

    const isOwner = project.createdById === sessionUserId;

    let isOrgMember = false;
    let canAssignTasks = false;
    if (project.organizationId) {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, project.organizationId),
            eq(organizationMembers.userId, sessionUserId),
          ),
        );

      isOrgMember = !!membership;
      canAssignTasks = membership?.canAssignTasks ?? false;

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, project.organizationId));

      const isOrgOwner = org?.createdById === sessionUserId;

      if (!isOwner && !isOrgOwner && !canAssignTasks) {
        throw new Error("Only the organization owner or authorized members can create tasks");
      }
    }

    if (!isOwner && !isOrgMember) {
      const [collaboration] = await db
        .select()
        .from(projectCollaborators)
        .where(
          and(
            eq(projectCollaborators.projectId, args.projectId),
            eq(projectCollaborators.collaboratorId, sessionUserId),
            eq(projectCollaborators.permission, "write"),
          ),
        );

      if (!collaboration) {
        throw new Error("You don't have permission to create tasks in this project");
      }
    }

    const [maxRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(${tasks.orderIndex}), 0)`.mapWith(Number) })
      .from(tasks)
      .where(eq(tasks.projectId, args.projectId));

    let nextOrderIndex = (maxRow?.max ?? 0) + 1;

    const now = new Date();

    const values = args.tasks.map((t) => {
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;

      if (Number.isNaN(dueDate?.getTime())) {
        throw new Error("Invalid dueDate provided for one of the tasks");
      }

      const value = {
        projectId: args.projectId,
        title: t.title,
        description: t.description ?? "",
        assignedToId: t.assignedToId ?? null,
        priority: t.priority,
        dueDate,
        status: "pending" as const,
        createdById: sessionUserId,
        orderIndex: nextOrderIndex,
      };

      nextOrderIndex += 1;
      return value;
    });

    const inserted = await db.insert(tasks).values(values).returning({ id: tasks.id });

    if (inserted.length) {
      await db.insert(taskActivityLog).values(
        inserted.map((row) => ({
          taskId: row.id,
          userId: sessionUserId,
          action: "created",
          newValue: "Task created",
        })),
      );
    }

    const createdTaskIds = inserted.map((row) => row.id);

    return { projectId: args.projectId, createdTaskIds };
  },
};

// --------------------
// Registry
// --------------------

export const projectTaskToolsRegistry: ToolRegistry = {
  [GetProjectOverviewTool.name]: GetProjectOverviewTool,
  [GetProjectTasksTool.name]: GetProjectTasksTool,
  [CreateTasksBatchTool.name]: CreateTasksBatchTool,
};
