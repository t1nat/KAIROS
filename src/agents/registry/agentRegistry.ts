import type { AgentDefinition, AgentId } from "../core/AgentDefinition";
import { ProjectPlanningAgent } from "../agents/ProjectPlanningAgent";

export const agentRegistry: Record<AgentId, AgentDefinition<any, any>> = {
  "project-planning": ProjectPlanningAgent,
};
