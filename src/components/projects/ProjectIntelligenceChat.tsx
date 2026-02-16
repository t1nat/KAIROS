"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";

type ChatMsg =
  | {
      role: "user";
      text: string;
      createdAt: Date;
    }
  | {
      role: "agent";
      text: string;
      createdAt: Date;
      actions?: Array<
        | { type: "notes_confirm"; draftId: string }
        | { type: "notes_apply"; draftId: string; confirmationToken: string }
      >;
    };

function clampText(s: string, max = 20_000): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

export function ProjectIntelligenceChat(props: { projectId?: number }) {
  const { projectId } = props;

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const a1Mutation = api.agent.projectChatbot.useMutation({
    onMutate: ({ message }) => {
      const userText = message.trim();
      if (!userText) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: userText, createdAt: new Date() },
        { role: "agent", text: "Thinking…", createdAt: new Date() },
      ]);

      setDraft("");
    },
    onError: (err) => {
      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i]?.role === "agent" && next[i]?.text === "Thinking…") {
            next[i] = { role: "agent", text: `Request failed: ${err.message}`, createdAt: new Date() };
            return next;
          }
        }
        return [...next, { role: "agent", text: `Request failed: ${err.message}`, createdAt: new Date() }];
      });
    },
    onSuccess: (data) => {
      const output = (data as unknown as { outputJson?: unknown }).outputJson as
        | {
            answer?: { summary: string; details?: string[] };
            handoff?: { targetAgent: string; userIntent: string };
            draftPlan?: { proposedChanges?: Array<{ summary: string }> };
          }
        | undefined;

      const agentText =
        output?.answer?.summary
          ? [output.answer.summary, ...(output.answer.details ?? []).map((d) => `• ${d}`)].join("\n")
          : output?.handoff
            ? `I can hand this off to ${output.handoff.targetAgent}: ${output.handoff.userIntent}`
            : output?.draftPlan?.proposedChanges?.length
              ? output.draftPlan.proposedChanges.map((c) => `• ${c.summary}`).join("\n")
              : "(no response)";

      setMessages((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i]?.role === "agent" && next[i]?.text === "Thinking…") {
            next[i] = { role: "agent", text: agentText, createdAt: new Date() };
            return next;
          }
        }
        return [...next, { role: "agent", text: agentText, createdAt: new Date() }];
      });
    },
  });

  const notesDraftMutation = api.agent.notesVaultDraft.useMutation();
  const notesConfirmMutation = api.agent.notesVaultConfirm.useMutation();
  const notesApplyMutation = api.agent.notesVaultApply.useMutation();

  const isNotesIntent = useCallback((text: string) => {
    const t = text.toLowerCase();
    return (
      t.includes("note") ||
      t.includes("notes") ||
      t.includes("sticky") ||
      t.includes("vault") ||
      t.includes("summarize my notes") ||
      t.includes("organize my notes")
    );
  }, []);

  const suggestedActions: string[] = [];

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg) return;

      // Note: user bubble insertion happens in `a1Mutation.onMutate` for the A1 flow,
      // and in the Notes Vault branch below for A3. Avoid double-inserting.
      setDraft("");

      const run = async () => {
        if (isNotesIntent(msg)) {
          // Notes Vault runs workspace-scoped; no projectId required.
          const res = await notesDraftMutation.mutateAsync({ message: clampText(msg) });

          const plan = (res as unknown as {
            plan?: {
              summary?: string;
              operations?: unknown[];
              blocked?: unknown[];
            };
          }).plan;
          const draftId = (res as unknown as { draftId?: string }).draftId ?? "";

          const operations = Array.isArray(plan?.operations) ? (plan!.operations as unknown[]) : [];
          const blocked = Array.isArray(plan?.blocked) ? (plan!.blocked as unknown[]) : [];

          const creates = operations.filter((o) => (o as any)?.type === "create").length;
          const updates = operations.filter((o) => (o as any)?.type === "update").length;
          const deletes = operations.filter((o) => (o as any)?.type === "delete").length;

          const chatbotSummary =
            creates > 0
              ? "Okay — I’ll create the note now."
              : updates > 0
                ? "Okay — I’ll update your note."
                : deletes > 0
                  ? "Okay — I’ll delete the note."
                  : "Okay — there’s nothing to change.";

          const agentText = [
            chatbotSummary,
            `Create ${creates} (blocked: ${blocked.length}) | Update ${updates} | Delete ${deletes}`,
            "Click Confirm to proceed.",
          ].join("\n");

          const shouldShowConfirm = operations.length > 0;

          setMessages((prev) => {
            const next = [...prev];
            for (let i = next.length - 1; i >= 0; i--) {
              if (next[i]?.role === "agent" && next[i]?.text === "Thinking…") {
                next[i] = {
                  role: "agent",
                  text: agentText,
                  createdAt: new Date(),
                  actions: shouldShowConfirm && draftId ? [{ type: "notes_confirm", draftId }] : undefined,
                };
                return next;
              }
            }
            return [
              ...next,
              {
                role: "agent",
                text: agentText,
                createdAt: new Date(),
                actions: shouldShowConfirm && draftId ? [{ type: "notes_confirm", draftId }] : undefined,
              },
            ];
          });

          return;
        }

        await a1Mutation.mutateAsync({ projectId, message: clampText(msg) });
      };

      // Keep the input editable; only the send button is disabled while pending
      void run().finally(() => {
        setTimeout(scrollToBottom, 0);
      });
    },
    [
      projectId,
      a1Mutation,
      isNotesIntent,
      notesDraftMutation,
      scrollToBottom,
    ],
  );

  return (
    <div className="h-full w-full flex flex-col bg-zinc-900">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-900">
        <div className="min-w-0">
          <p className="text-xs text-fg-tertiary truncate">Workspace Concierge</p>
        </div>

        <button
          type="button"
          className="text-xs px-2.5 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-secondary/60 text-fg-secondary transition-colors"
          onClick={() => setShowAssumptions((v) => !v)}
        >
          {showAssumptions ? "Hide" : "Show"} info
        </button>
      </div>

      {showAssumptions && (
        <div className="px-4 py-3 border-b border-white/10 bg-zinc-800">
          <div className="w-full max-w-3xl">
            <p className="text-xs text-fg-tertiary leading-relaxed">
              This chat is project-scoped. Predictions are best-effort; treat them as guidance and verify against task data.
            </p>
            <p className="text-xs text-fg-tertiary mt-1">Confidence: not yet implemented (placeholder).</p>
            <p className="text-xs text-fg-tertiary mt-1">Data sources: tasks + project metadata (as available).</p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
        <div className="w-full max-w-3xl space-y-4">
          {messages.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-fg-tertiary">Ask a question about your workspace or projects.</p>
            </div>
          ) : (
            messages.map((m, idx) => (
              <div key={`${m.createdAt.toISOString()}-${idx}`} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent-primary text-white px-4 py-2.5 shadow-sm"
                      : "max-w-[85%] rounded-2xl rounded-bl-md bg-bg-elevated text-fg-primary px-4 py-2.5 shadow-sm"
                  }
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    title="Click to copy"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(m.text);
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: "agent",
                            text: "Copied to clipboard.",
                            createdAt: new Date(),
                          },
                        ]);
                      } catch {
                        setMessages((prev) => [
                          ...prev,
                          {
                            role: "agent",
                            text: "Copy failed (clipboard permission denied).",
                            createdAt: new Date(),
                          },
                        ]);
                      }
                    }}
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
                  </button>

                  {m.role === "agent" && m.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.actions.map((a, aIdx) => {
                        if (a.type === "notes_confirm") {
                          return (
                            <button
                              key={`${a.type}-${a.draftId}-${aIdx}`}
                              type="button"
                              className="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary/60 hover:bg-bg-secondary text-fg-primary border border-white/10"
                              disabled={notesConfirmMutation.isPending}
                              onClick={async () => {
                                try {
                                  const res = await notesConfirmMutation.mutateAsync({ draftId: a.draftId });
                                  const token = (res as unknown as { confirmationToken: string }).confirmationToken;
                                  const summary = (res as unknown as { summary?: unknown }).summary;

                                  setMessages((prev) => {
                                    const next = [...prev];
                                    next.push({
                                      role: "agent",
                                      text: `Confirmed. Summary: ${JSON.stringify(summary)}`,
                                      createdAt: new Date(),
                                      actions: [{ type: "notes_apply", draftId: a.draftId, confirmationToken: token }],
                                    });
                                    return next;
                                  });
                                } catch (err) {
                                  const msg =
                                    err instanceof Error
                                      ? err.message
                                      : typeof err === "string"
                                        ? err
                                        : "Confirm failed";

                                  setMessages((prev) => {
                                    const next = [...prev];
                                    next.push({
                                      role: "agent",
                                      text: msg.includes("status=confirmed")
                                        ? "This draft was already confirmed. Use Apply."
                                        : `Confirm failed: ${msg}`,
                                      createdAt: new Date(),
                                    });
                                    return next;
                                  });
                                }
                              }}
                            >
                              Confirm
                            </button>
                          );
                        }

                        if (a.type === "notes_apply") {
                          return (
                            <button
                              key={`${a.type}-${a.draftId}-${aIdx}`}
                              type="button"
                              className="text-xs px-3 py-1.5 rounded-lg bg-accent-primary/90 hover:bg-accent-primary text-white"
                              disabled={notesApplyMutation.isPending}
                              onClick={async () => {
                                const res = await notesApplyMutation.mutateAsync({
                                  draftId: a.draftId,
                                  confirmationToken: a.confirmationToken,
                                });

                                const results = (res as unknown as { results?: unknown }).results;
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    role: "agent",
                                    text: `Applied. Result: ${JSON.stringify(results)}`,
                                    createdAt: new Date(),
                                  },
                                ]);
                              }}
                            >
                              Apply
                            </button>
                          );
                        }

                        return null;
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          <div className="h-2" />
        </div>
      </div>

      <form
        className="shrink-0 border-t border-white/10 bg-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft);
        }}
      >
        <div className="w-full max-w-3xl px-4 py-4 lg:pl-8">
          <div className="flex items-end gap-2 rounded-[999px] bg-bg-elevated px-3 py-2 shadow-sm">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message A1…"
              className="flex-1 bg-transparent px-2 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className={
                "h-10 shrink-0 px-4 rounded-full text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed " +
                (!a1Mutation.isPending && !notesDraftMutation.isPending && draft.trim()
                  ? "text-white hover:opacity-90"
                  : "bg-bg-secondary text-fg-tertiary")
              }
              disabled={
                a1Mutation.isPending ||
                notesDraftMutation.isPending ||
                notesConfirmMutation.isPending ||
                notesApplyMutation.isPending ||
                !draft.trim()
              }
              style={
                !a1Mutation.isPending && !notesDraftMutation.isPending && draft.trim()
                  ? { backgroundColor: `rgb(var(--accent-primary))` }
                  : { backgroundColor: "rgba(255,255,255,0.06)" }
              }
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[11px] text-fg-tertiary text-center">
            A1 answers are best-effort. Verify critical decisions.
          </p>
        </div>
      </form>
    </div>
  );
}

