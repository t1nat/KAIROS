import { A1OutputSchema } from "~/server/agents/schemas/a1WorkspaceConciergeSchemas";

export interface AgentProfile {
  id: string;
  name: string;
  description: string;
  outputSchema: typeof A1OutputSchema;
}

export const a1WorkspaceConciergeProfile: AgentProfile = {
  id: "workspace_concierge",
  name: "Workspace Concierge",
  description:
    "A read-first front door agent that answers workspace questions and drafts handoffs/plans; no side effects without approval.",
  outputSchema: A1OutputSchema,
};
