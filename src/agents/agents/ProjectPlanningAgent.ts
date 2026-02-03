import { z } from "zod";

import type { AgentDefinition } from "../core/AgentDefinition";
import type { AgentContext } from "../core/AgentContext";
import {
  PlannedTaskSuggestionSchema,
  type PlannedTaskSuggestion,
  type ProjectPlanningAgentResult,
} from "~/lib/agents/types";
import type { GetProjectOverviewResult, GetProjectTasksResult } from "../tools/ProjectTaskTools";

// -------- Input schema --------

export const ProjectPlanningAgentInputSchema = z.object({
  projectId: z.number().int().positive(),
  extraContext: z.string().max(2000).optional(),
  targetDate: z.string().datetime().optional(),
  allowWrite: z.boolean().default(false),
});

export type ProjectPlanningAgentInput = z.infer<typeof ProjectPlanningAgentInputSchema>;

// Re-export for registry convenience
export const ProjectPlanningAgentId = "project-planning" as const;

// -------- LLM schemas --------

const LLMPlannedTaskSuggestionSchema = PlannedTaskSuggestionSchema;

const LLMProjectPlanSchema = z.object({
  summary: z.string().min(1),
  notes: z.string().optional(),
  tasks: z.array(LLMPlannedTaskSuggestionSchema).min(1),
});

type LLMProjectPlan = z.infer<typeof LLMProjectPlanSchema>;

// -------- Agent implementation --------

async function runProjectPlanningAgent(
  ctx: AgentContext,
  input: ProjectPlanningAgentInput,
): Promise<ProjectPlanningAgentResult> {
  const { projectId, extraContext, targetDate, allowWrite } = input;

  // 1) Gather project context via tools
  const toolCtx = { db: ctx.db, sessionUserId: ctx.user.id };

  await ctx.log({ type: "project-planning:fetch-context:start", projectId });

  const projectOverview = (await ctx.tools["project.getOverview"]?.execute(toolCtx, {
    projectId,
  })) as GetProjectOverviewResult;

  const { tasks: existingTasks } = (await ctx.tools["project.getTasks"]?.execute(toolCtx, {
    projectId,
  })) as GetProjectTasksResult;

  await ctx.log({
    type: "project-planning:fetch-context:done",
    projectId,
    existingTaskCount: existingTasks.length,
  });

  // 2) Build LLM prompt
  const projectSummaryLines: string[] = [];
  projectSummaryLines.push(`Project: ${projectOverview.title} (status: ${projectOverview.status})`);
  if (projectOverview.description) {
    projectSummaryLines.push(`Description: ${projectOverview.description}`);
  }

  if (existingTasks.length > 0) {
    projectSummaryLines.push("Existing tasks:");
    for (const task of existingTasks.slice(0, 50)) {
      projectSummaryLines.push(
        `- [${task.status}] (${task.priority}) ${task.title}` +
          (task.dueDate ? ` (due ${task.dueDate.toISOString()})` : ""),
      );
    }
  } else {
    projectSummaryLines.push("There are currently no tasks for this project.");
  }

  if (extraContext) {
    projectSummaryLines.push("");
    projectSummaryLines.push("Additional user context:");
    projectSummaryLines.push(extraContext);
  }

  if (targetDate) {
    projectSummaryLines.push("");
    projectSummaryLines.push(`Target completion date: ${targetDate}`);
  }

  const projectContextText = projectSummaryLines.join("\n");

  const systemMessage =
    "You are an expert project planning assistant. Given a project and its existing tasks, you propose a clear, actionable task plan. " +
    "Return concise, well-scoped tasks that move the project forward. Use the provided schema and do not include tasks that already obviously exist unless they need refinement.";

  const userMessage = [
    "Plan the next steps for the following project.",
    "You must:",
    "- Propose a list of tasks in a reasonable execution order.",
    "- Prefer fewer, higher-quality tasks over many tiny ones.",
    "- Include suggestedDueDate only when it is helpful and realistic.",
    "- Optionally suggest an assignee via suggestedAssigneeId when it is clearly implied (e.g. project owner).",
    "- Avoid duplicating existing tasks unless they need to be significantly improved.",
    "",
    "Project context:",
    projectContextText,
  ].join("\n");

  await ctx.log({
    type: "project-planning:llm:request",
    projectId,
  });

  const llmResult = await ctx.llm.generateStructured<LLMProjectPlan>({
    schema: LLMProjectPlanSchema,
    temperature: 0.3,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
  });

  await ctx.log({
    type: "project-planning:llm:response",
    projectId,
    rawTextLength: llmResult.rawText.length,
    taskCount: llmResult.parsed.tasks.length,
  });

  let plannedTasks: PlannedTaskSuggestion[] = llmResult.parsed.tasks;

  // Normalize orderIndex to a simple 0..n-1 sequence
  plannedTasks = plannedTasks.map((task, index) => ({
    ...task,
    orderIndex: index,
  }));

  // 3) Optionally write tasks to the database
  let writeNotes = "";
  if (allowWrite && plannedTasks.length > 0) {
    const creatableTasks = plannedTasks.slice(0, 50).map((task) => ({
      title: task.title,
      description: task.description,
      assignedToId: task.suggestedAssigneeId ?? undefined,
      priority: "medium" as const,
      dueDate: task.suggestedDueDate,
    }));

    await ctx.log({
      type: "project-planning:write:start",
      projectId,
      taskCount: creatableTasks.length,
    });

    const createResult = await ctx.tools["task.createBatch"]?.execute(toolCtx, {
      projectId,
      tasks: creatableTasks,
    });

    writeNotes = `\n\nCreated ${createResult.createdTaskIds.length} tasks in the project.`;

    await ctx.log({
      type: "project-planning:write:done",
      projectId,
      createdTaskCount: createResult.createdTaskIds.length,
    });
  }

  const result: ProjectPlanningAgentResult = {
    projectId,
    tasks: plannedTasks,
    summary: llmResult.parsed.summary,
    notes: (llmResult.parsed.notes ?? "") + writeNotes,
  };

  return result;
}

export const ProjectPlanningAgent: AgentDefinition<ProjectPlanningAgentInput, ProjectPlanningAgentResult> = {
  id: ProjectPlanningAgentId,
  name: "Project Planning Agent",
  description: "Generates a structured task plan from a high-level project description.",
  inputSchema: ProjectPlanningAgentInputSchema,
  run: runProjectPlanningAgent,
};
