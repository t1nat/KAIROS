import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { AgentRunner } from "~/agents/core/AgentRunner";
import { ProjectPlanningAgentInputSchema } from "~/agents/agents/ProjectPlanningAgent";
import { agentRegistry } from "~/agents/registry/agentRegistry";
import { projectTaskToolsRegistry } from "~/agents/tools/ProjectTaskTools";

import { env } from "~/env";
import { OpenAILLMClient } from "~/agents/llm/OpenAILLMClient";
import type { LLMClient } from "~/agents/llm/LLMClient";

let cachedLLMClient: LLMClient | null = null;

function getLLMClient(): LLMClient {
  if (cachedLLMClient) return cachedLLMClient;

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env file to enable the Project Planning Agent.",
    );
  }

  cachedLLMClient = new OpenAILLMClient({
    apiKey,
    defaultModel: "gpt-4o-mini",
  });

  return cachedLLMClient;
}

export const agentRouter = createTRPCRouter({
  runProjectPlanning: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int().positive(),
        extraContext: z.string().max(2000).optional(),
        targetDate: z.string().datetime().optional(),
        allowWrite: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate using the agent's own schema too (keeps router and agent in sync)
      const parsed = ProjectPlanningAgentInputSchema.parse(input);

      const runner = new AgentRunner({
        db: ctx.db,
        llm: getLLMClient(),
        tools: {
          ...projectTaskToolsRegistry,
        },
      });

      const run = await runner.run({
        agent: agentRegistry["project-planning"],
        sessionUserId: ctx.session.user.id,
        input: parsed,
      });

      return run;
    }),
});
