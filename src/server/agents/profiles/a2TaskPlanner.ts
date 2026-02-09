import { TaskPlanDraftSchema } from "~/server/agents/schemas/a2TaskPlannerSchemas";

export type A2ReadToolName =
  | "getSessionContext"
  | "getProjectDetail"
  | "listTasks"
  | "getTaskDetail";

export type A2WriteToolName =
  | "createTask"
  | "updateTask"
  | "updateTaskStatus"
  | "deleteTask";

export interface TaskPlannerAgentProfile {
  id: "task_planner";
  name: string;
  description: string;
  outputSchema: typeof TaskPlanDraftSchema;
  /** Read tools allowed during draft phase */
  draftToolAllowlist: readonly A2ReadToolName[];
  /** Write tools allowed during apply phase */
  applyToolAllowlist: readonly A2WriteToolName[];
}

export const a2TaskPlannerProfile: TaskPlannerAgentProfile = {
  id: "task_planner",
  name: "Task Planner",
  description:
    "A task-domain agent that turns goals into an actionable backlog and safely applies task mutations via Draft → Confirm → Apply.",
  outputSchema: TaskPlanDraftSchema,
  draftToolAllowlist: [
    "getSessionContext",
    "getProjectDetail",
    "listTasks",
    "getTaskDetail",
  ],
  applyToolAllowlist: [
    "createTask",
    "updateTask",
    "updateTaskStatus",
    "deleteTask",
  ],
};
