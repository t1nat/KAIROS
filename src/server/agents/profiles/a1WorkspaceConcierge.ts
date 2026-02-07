import { A1OutputSchema } from "~/server/agents/schemas/a1WorkspaceConciergeSchemas";
import type { A1ReadToolName } from "~/server/agents/tools/a1/readTools";

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  outputSchema: typeof A1OutputSchema;
  /** Read tools allowed during draft phase */
  draftToolAllowlist: readonly A1ReadToolName[];
  /** Routing rules — which intents route to which agents */
  routingRules: Record<string, string>;
}

export const a1WorkspaceConciergeProfile: AgentProfile = {
  id: "workspace_concierge",
  name: "Workspace Concierge",
  description:
    "A read-first front door agent that answers workspace questions, analyzes project descriptions to draft task plans, and produces handoffs for write operations — no side effects without approval.",
  outputSchema: A1OutputSchema,
  draftToolAllowlist: [
    "getSessionContext",
    "listOrganizations",
    "listProjects",
    "getProjectDetail",
    "listTasks",
    "getTaskDetail",
    "listNotifications",
    "listEventsPublic",
  ],
  routingRules: {
    modify_tasks: "task_planner",
    notes_ops: "notes_vault",
    events_ops: "events_publisher",
    membership_ops: "org_admin",
  },
};
