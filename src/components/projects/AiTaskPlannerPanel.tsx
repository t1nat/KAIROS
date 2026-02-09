/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Shield, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";

type PlanSummary = {
  creates: number;
  updates: number;
  statusChanges: number;
  deletes: number;
};

type A2Plan = {
  agentId: "task_planner";
  scope: { orgId?: string | number; projectId: number };
  creates: Array<{ title: string; priority: string; clientRequestId: string }>;
  updates: Array<{ taskId: number }>;
  statusChanges: Array<{ taskId: number; status: string }>;
  deletes: Array<{ taskId: number; dangerous: boolean }>;
  risks: string[];
  questionsForUser: string[];
  diffPreview: {
    creates: string[];
    updates: string[];
    statusChanges: string[];
    deletes: string[];
  };
  planHash?: string;
};

export function AiTaskPlannerPanel(props: {
  projectId: number;
  orgId?: string | number;
  onApplied?: () => void;
  onClose?: () => void;
}) {
  const { projectId, orgId, onApplied, onClose } = props;

  const [message, setMessage] = useState<string>(
    "Create a detailed task plan for this project. Keep it actionable, dedupe existing tasks, and include a clear diff preview.",
  );

  const [draftId, setDraftId] = useState<string | null>(null);
  const [plan, setPlan] = useState<A2Plan | null>(null);
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [confirmSummary, setConfirmSummary] = useState<PlanSummary | null>(null);

  const draftMutation = api.agent.taskPlannerDraft.useMutation({
    onSuccess(data) {
      setDraftId(data.draftId);
      setPlan(data.plan as unknown as A2Plan);
      setConfirmationToken(null);
      setConfirmSummary(null);
    },
  });

  const confirmMutation = api.agent.taskPlannerConfirm.useMutation({
    onSuccess(data) {
      setConfirmationToken(data.confirmationToken);
      setConfirmSummary(data.summary);
    },
  });

  const applyMutation = api.agent.taskPlannerApply.useMutation({
    onSuccess() {
      onApplied?.();
    },
  });

  const isPending = draftMutation.isPending || confirmMutation.isPending || applyMutation.isPending;

  const hasDeletes = useMemo(() => {
    const del = plan?.deletes ?? [];
    return del.some((d) => d.dangerous);
  }, [plan]);

  const handleDraft = useCallback(() => {
    const trimmed = message.trim();
    if (!trimmed) return;
    draftMutation.mutate({
      message: trimmed,
      scope: { orgId, projectId },
    });
  }, [draftMutation, message, orgId, projectId]);

  const handleConfirm = useCallback(() => {
    if (!draftId) return;
    confirmMutation.mutate({ draftId });
  }, [confirmMutation, draftId]);

  const handleApply = useCallback(() => {
    if (!draftId || !confirmationToken) return;
    applyMutation.mutate({ draftId, confirmationToken });
  }, [applyMutation, confirmationToken, draftId]);

  return (
    <div className="kairos-bg-surface rounded-[10px] overflow-hidden kairos-section-border">
      <div className="px-5 py-4 flex items-center justify-between border-b border-border-light/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white shadow-lg shadow-accent-primary/20">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold kairos-fg-primary leading-tight">AI Task Planner</h2>
            <p className="text-[12px] kairos-fg-secondary leading-tight">Draft → Confirm → Apply (with audit)</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg kairos-fg-secondary hover:kairos-fg-primary hover:kairos-bg-surface transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-[12px] uppercase tracking-wide kairos-fg-secondary">What should the planner do?</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            // Allow typing even while the LLM is generating.
            // Only actions (Draft/Confirm/Apply) are blocked via button disabled states.
            disabled={false}
            rows={4}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-[13px] outline-none",
              "kairos-bg-base kairos-fg-primary border border-border-light/20",
              "focus:border-accent-primary/40",
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDraft}
            disabled={isPending || message.trim().length === 0}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition",
              "bg-accent-primary text-white hover:opacity-95 disabled:opacity-50",
            )}
          >
            {draftMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Draft plan
          </button>

          <button
            onClick={handleConfirm}
            disabled={isPending || !draftId}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition",
              "kairos-bg-base kairos-fg-primary border border-border-light/20 hover:kairos-bg-surface",
              "disabled:opacity-50",
            )}
          >
            {confirmMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Confirm
          </button>

          <button
            onClick={handleApply}
            disabled={isPending || !draftId || !confirmationToken}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition",
              "bg-emerald-600 text-white hover:opacity-95 disabled:opacity-50",
            )}
          >
            {applyMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Apply
          </button>
        </div>

        <AnimatePresence>
          {(draftMutation.error ?? confirmMutation.error ?? applyMutation.error) && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <AlertCircle size={16} className="mt-0.5 text-red-400" />
              <div className="text-[13px] kairos-fg-primary">
                {(draftMutation.error?.message ??
                  confirmMutation.error?.message ??
                  applyMutation.error?.message ??
                  "Unknown error")}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[12px] uppercase tracking-wide kairos-fg-secondary">Diff preview</div>
              <div className="text-[12px] kairos-fg-secondary">planHash: {plan.planHash ?? "(pending)"}</div>
            </div>

            {hasDeletes && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[13px] kairos-fg-primary">
                This plan includes deletes. Confirm carefully before applying.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <DiffList title={`Creates (${plan.diffPreview.creates.length})`} items={plan.diffPreview.creates} />
              <DiffList title={`Updates (${plan.diffPreview.updates.length})`} items={plan.diffPreview.updates} />
              <DiffList title={`Status changes (${plan.diffPreview.statusChanges.length})`} items={plan.diffPreview.statusChanges} />
              <DiffList title={`Deletes (${plan.diffPreview.deletes.length})`} items={plan.diffPreview.deletes} />
            </div>

            {confirmSummary && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[13px] kairos-fg-primary">
                Confirmed: {confirmSummary.creates} creates, {confirmSummary.updates} updates, {confirmSummary.statusChanges} status changes, {confirmSummary.deletes} deletes.
              </div>
            )}

            {plan.questionsForUser?.length ? (
              <div className="p-3 rounded-lg kairos-bg-base border border-border-light/20">
                <div className="text-[12px] uppercase tracking-wide kairos-fg-secondary mb-2">Questions</div>
                <ul className="list-disc pl-5 space-y-1 text-[13px] kairos-fg-primary">
                  {plan.questionsForUser.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {plan.risks?.length ? (
              <div className="p-3 rounded-lg kairos-bg-base border border-border-light/20">
                <div className="text-[12px] uppercase tracking-wide kairos-fg-secondary mb-2">Risks</div>
                <ul className="list-disc pl-5 space-y-1 text-[13px] kairos-fg-primary">
                  {plan.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffList(props: { title: string; items: string[] }) {
  const { title, items } = props;
  return (
    <div className="p-3 rounded-lg kairos-bg-base border border-border-light/20">
      <div className="text-[12px] uppercase tracking-wide kairos-fg-secondary mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-[13px] kairos-fg-secondary">No changes</div>
      ) : (
        <ul className="space-y-1 text-[13px] kairos-fg-primary">
          {items.slice(0, 12).map((it, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full bg-accent-primary/70 shrink-0" />
              <span>{it}</span>
            </li>
          ))}
          {items.length > 12 && (
            <li className="text-[13px] kairos-fg-secondary">…and {items.length - 12} more</li>
          )}
        </ul>
      )}
    </div>
  );
}
