import { TRPCError } from "@trpc/server";

import type { TRPCContext } from "~/server/api/trpc";
import { a1WorkspaceConciergeProfile } from "~/server/agents/profiles/a1WorkspaceConcierge";
import { A1OutputSchema, type A1Output } from "~/server/agents/schemas/a1WorkspaceConciergeSchemas";
import { A1_READ_TOOLS } from "~/server/agents/tools/a1/readTools";

export type AgentId = "workspace_concierge";

export interface AgentDraftInput {
  ctx: TRPCContext;
  agentId: AgentId;
  message: string;
  scope?: {
    orgId?: string | number;
    projectId?: string | number;
  };
}

export interface AgentDraftResult {
  draftId: string;
  outputJson: A1Output;
}

function createDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const agentOrchestrator = {
  async draft(input: AgentDraftInput): Promise<AgentDraftResult> {
    const profile =
      input.agentId === "workspace_concierge"
        ? a1WorkspaceConciergeProfile
        : null;

    if (!profile) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Unknown agentId: ${input.agentId}`,
      });
    }

    const draftId = createDraftId();

    // Draft flow v1 (read-only, no LLM yet):
    // - enforce a read-tool allowlist at the orchestrator boundary
    // - execute only a small set of read tools based on scope
    // - build a small context pack (kept server-side for now)
    // - return a strict JSON draftPlan describing what was queried

    const allowedReadTools = new Set([
      "getSessionContext",
      "listOrganizations",
      "listProjects",
      "getProjectDetail",
      "listTasks",
      "getTaskDetail",
      "listNotifications",
      "listEventsPublic",
    ] satisfies ReadonlyArray<keyof typeof A1_READ_TOOLS>);

    type AllowedReadToolName = (typeof allowedReadTools) extends Set<infer T>
      ? T
      : never;

    const readQueries: Array<{ tool: AllowedReadToolName; input: unknown }> = [
      { tool: "getSessionContext", input: {} },
      { tool: "listProjects", input: { limit: 10 } },
      { tool: "listNotifications", input: { limit: 10 } },
    ];

    if (input.scope?.projectId != null) {
      const projectId =
        typeof input.scope.projectId === "string"
          ? Number(input.scope.projectId)
          : input.scope.projectId;

      if (Number.isFinite(projectId)) {
        readQueries.push({
          tool: "listTasks",
          input: { projectId, limit: 10 },
        });
      }
    }

    // Tool execution
    const toolResults: Partial<Record<AllowedReadToolName, unknown>> = {};
    for (const q of readQueries) {
      // Compile-time tool name typing should ensure this, but keep runtime protection.
      if (!allowedReadTools.has(q.tool)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tool not allowed in A1 draft: ${q.tool}`,
        });
      }

      const tool = A1_READ_TOOLS[q.tool];

      // The tools map is heterogeneous (each tool has a different input/output type),
      // so we rely on runtime Zod validation at this boundary.
      const parsedInput = tool.inputSchema.parse(q.input) as unknown;
      const result = await tool.execute(input.ctx, parsedInput as never);
      toolResults[q.tool] = tool.outputSchema.parse(result);
    }

    const sessionCtx = toolResults.getSessionContext as {
      userId: string;
      activeOrganizationId: number | null;
    };

    const projects = (toolResults.listProjects as unknown[]) ?? [];
    const notifications = (toolResults.listNotifications as unknown[]) ?? [];

    // Context pack is intentionally not returned verbatim yet.
    // Next step: pass it to the LLM prompt builder.
    const _contextPack = {
      session: toolResults.getSessionContext,
      projects: toolResults.listProjects,
      notifications: toolResults.listNotifications,
      tasks: toolResults.listTasks,
      scope: input.scope ?? {},
      now: new Date().toISOString(),
    };
    void _contextPack;

    const outputJson: A1Output = A1OutputSchema.parse({
      intent: {
        type: "draft_plan",
        scope: input.scope ?? {},
      },
      answer: {
        summary:
          "Draft workspace snapshot (read-only). A1 does not execute writes; it drafts plans/handoffs.",
        details: [
          `userId=${sessionCtx.userId}`,
          `activeOrgId=${sessionCtx.activeOrganizationId ?? "none"}`,
          `projects=${projects.length}`,
          `notifications=${notifications.length}`,
        ],
      },
      draftPlan: {
        readQueries,
        proposedChanges: [],
        applyCalls: [],
      },
      citations: [{ label: "profile", ref: profile.id }],
    });

    return {
      draftId,
      outputJson,
    };
  },
};
