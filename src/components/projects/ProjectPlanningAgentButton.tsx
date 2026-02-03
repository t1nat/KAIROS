"use client";

import { useState } from "react";

import { api } from "~/trpc/react";
import { useToast } from "~/components/providers/ToastProvider";
import type { ProjectPlanningAgentResult } from "~/lib/agents/types";

export function ProjectPlanningAgentButton({ projectId }: { projectId: number }) {
  const toast = useToast();
  const [extraContext, setExtraContext] = useState<string>("");

  const run = api.agent.runProjectPlanning.useMutation({
    onSuccess: (data) => {
      toast.success(`Agent run ${data.runId} completed`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="rounded-lg border border-border bg-bg-secondary/40 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Project Planning Agent</div>
          <div className="text-xs text-text-secondary">
            Generates a proposed task plan. If allow-write is enabled, it will create tasks.
          </div>
        </div>

        <button
          onClick={() => run.mutate({ projectId, extraContext, allowWrite: false })}
          disabled={run.isPending}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {run.isPending ? "Planning…" : "Generate plan"}
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-xs text-text-secondary">Extra context (optional)</label>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-bg-primary p-2 text-sm"
          rows={3}
          maxLength={2000}
          placeholder="e.g. team constraints, milestones, tech stack, priorities…"
        />
      </div>

      {run.data?.result ? (
        <div className="mt-4">
          <div className="text-sm font-medium">Result</div>
          <div className="mt-1 text-sm text-text-secondary">
            {(run.data.result as ProjectPlanningAgentResult).summary}
          </div>

          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            {(run.data.result as ProjectPlanningAgentResult).tasks.map((t) => (
              <li key={t.orderIndex}>
                <div className="font-medium">{t.title}</div>
                {t.description ? <div className="text-text-secondary">{t.description}</div> : null}
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="mt-3 text-xs text-text-secondary">
        Note: the server-side LLMClient is currently not wired, so this will error until configured.
      </div>
    </div>
  );
}
