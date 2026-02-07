/**
 * Context Builder for the Workspace Concierge (A1).
 *
 * Assembles a small, relevant, token-bounded context pack from the DB
 * that gets injected into the system prompt for LLM calls.
 */
import type { TRPCContext } from "~/server/api/trpc";
import { A1_READ_TOOLS } from "~/server/agents/tools/a1/readTools";

export interface A1ContextPack {
  session: {
    userId: string;
    email: string | null;
    name: string | null;
    activeOrganizationId: number | null;
  };
  projects: Array<{
    id: number;
    title: string;
    description: string | null;
    status: string;
  }>;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
  }>;
  notifications: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    read: boolean;
  }>;
  projectDetail?: {
    id: number;
    title: string;
    description: string | null;
    status: string;
  } | null;
  now: string;
}

/**
 * Build a context pack for A1 from the database.
 */
export async function buildA1Context(
  ctx: TRPCContext,
  scope?: { orgId?: string | number; projectId?: string | number },
): Promise<A1ContextPack> {
  // 1. Session context
  const sessionResult = await A1_READ_TOOLS.getSessionContext.execute(ctx, {} as never);

  // 2. Projects (top 10)
  const projectsResult = await A1_READ_TOOLS.listProjects.execute(ctx, { limit: 10 });

  // 3. Notifications (top 10)
  const notificationsResult = await A1_READ_TOOLS.listNotifications.execute(ctx, { limit: 10 });

  // 4. Tasks — only if a projectId is in scope
  let tasksResult: Array<{
    id: number;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    updatedAt: Date;
  }> = [];

  const projectId = scope?.projectId
    ? typeof scope.projectId === "string"
      ? Number(scope.projectId)
      : scope.projectId
    : null;

  if (projectId && Number.isFinite(projectId)) {
    tasksResult = await A1_READ_TOOLS.listTasks.execute(ctx, {
      projectId,
      limit: 20,
    });
  }

  // 5. Optional project detail
  let projectDetail = null;
  if (projectId && Number.isFinite(projectId)) {
    const found = projectsResult.find((p) => p.id === projectId);
    if (found) {
      projectDetail = {
        id: found.id,
        title: found.title,
        description: found.description,
        status: found.status,
      };
    }
  }

  return {
    session: {
      userId: sessionResult.userId,
      email: sessionResult.email,
      name: sessionResult.name,
      activeOrganizationId: sessionResult.activeOrganizationId,
    },
    projects: projectsResult.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      status: p.status,
    })),
    tasks: tasksResult.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
    })),
    notifications: notificationsResult.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
    })),
    projectDetail,
    now: new Date().toISOString(),
  };
}
