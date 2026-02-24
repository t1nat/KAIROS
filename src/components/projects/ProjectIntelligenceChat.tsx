"use client";

import { useCallback, useRef, useState } from "react";
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
        | { type: "events_confirm"; draftId: string }
        | { type: "events_apply"; draftId: string; confirmationToken: string }
      >;
    };

// Type definitions for mutation responses
interface NotesDraftResponse {
  draftId?: string;
  plan?: {
    summary?: string;
    operations?: unknown[];
    blocked?: unknown[];
  };
}

interface EventsDraftResponse {
  draftId?: string;
  plan?: {
    summary?: string;
    creates?: unknown[];
    updates?: unknown[];
    deletes?: unknown[];
    comments?: { add?: unknown[]; remove?: unknown[] };
    rsvps?: unknown[];
    likes?: unknown[];
    questionsForUser?: string[];
  };
}

interface ConfirmResponse {
  confirmationToken: string;
  summary?: unknown;
  status?: string;
}

interface ApplyResponse {
  results?: unknown;
}

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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const eventsDraftMutation = api.agent.eventsPublisherDraft.useMutation();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const eventsConfirmMutation = api.agent.eventsPublisherConfirm.useMutation();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const eventsApplyMutation = api.agent.eventsPublisherApply.useMutation();

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

  const isEventsIntent = useCallback((text: string) => {
    const t = text.toLowerCase();
    return (
      t.includes("event") ||
      t.includes("events") ||
      t.includes("rsvp") ||
      t.includes("publish") ||
      t.includes("create an event") ||
      t.includes("schedule an event") ||
      t.includes("organize an event")
    );
  }, []);

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

      setDraft("");

      const run = async () => {
        if (isEventsIntent(msg)) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: msg, createdAt: new Date() },
            { role: "agent", text: "Thinking…", createdAt: new Date() },
          ]);

          try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            const res = await eventsDraftMutation.mutateAsync({ message: clampText(msg) }) as EventsDraftResponse;

            const plan = res?.plan;
            const draftId = res?.draftId ?? "";

            const creates = Array.isArray(plan?.creates) ? plan.creates.length : 0;
            const updates = Array.isArray(plan?.updates) ? plan.updates.length : 0;
            const deletes = Array.isArray(plan?.deletes) ? plan.deletes.length : 0;
            const questions = Array.isArray(plan?.questionsForUser) ? plan.questionsForUser : [];

            let agentText: string;
            if (questions.length > 0) {
              agentText = `I need some clarification:\n${questions.map(q => `• ${q}`).join("\n")}`;
            } else {
              const summaryLine = plan?.summary ?? "Here's what I plan to do:";
              agentText = [
                summaryLine,
                `Create ${creates} | Update ${updates} | Delete ${deletes}`,
                creates + updates + deletes > 0 ? "Click Confirm to proceed." : "",
              ].filter(Boolean).join("\n");
            }

            const hasOps = creates + updates + deletes > 0;

            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i]?.role === "agent" && next[i]?.text === "Thinking…") {
                  next[i] = {
                    role: "agent",
                    text: agentText,
                    createdAt: new Date(),
                    actions: hasOps && draftId ? [{ type: "events_confirm", draftId }] : undefined,
                  };
                  return next;
                }
              }
              return next;
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : "Events request failed";
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i]?.role === "agent" && next[i]?.text === "Thinking…") {
                  next[i] = { role: "agent", text: `Request failed: ${errMsg}`, createdAt: new Date() };
                  return next;
                }
              }
              return next;
            });
          }

          return;
        }

        if (isNotesIntent(msg)) {
          const res = await notesDraftMutation.mutateAsync({ message: clampText(msg) }) as NotesDraftResponse;

          const plan = res?.plan;
          const draftId = res?.draftId ?? "";

          const operations = Array.isArray(plan?.operations) ? plan.operations : [];
          const blocked = Array.isArray(plan?.blocked) ? plan.blocked : [];

          const creates = operations.filter((o) => (o as Record<string, unknown>)?.type === "create").length;
          const updates = operations.filter((o) => (o as Record<string, unknown>)?.type === "update").length;
          const deletes = operations.filter((o) => (o as Record<string, unknown>)?.type === "delete").length;

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

      void run().finally(() => {
        setTimeout(scrollToBottom, 0);
      });
    },
    [
      projectId,
      a1Mutation,
      isNotesIntent,
      isEventsIntent,
      notesDraftMutation,
      eventsDraftMutation,
      scrollToBottom,
    ],
  );

  // Helper function to check if any mutation is pending
  const isAnyMutationPending = (): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const eventsPending = Boolean(eventsDraftMutation.isPending) || Boolean(eventsConfirmMutation.isPending) || Boolean(eventsApplyMutation.isPending);
    return Boolean(a1Mutation.isPending) || Boolean(notesDraftMutation.isPending) || Boolean(notesConfirmMutation.isPending) || Boolean(notesApplyMutation.isPending) || eventsPending;
  };

  return (
    <div className="h-full w-full flex flex-col" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
      {/* Header - completely solid with solid border */}
      <div 
        className="px-4 py-3 flex items-center justify-between gap-3 border-b"
        style={{ 
          backgroundColor: 'rgb(var(--bg-primary))',
          borderBottomColor: 'rgb(var(--border-medium))',
          borderBottomWidth: '1px',
          borderBottomStyle: 'solid'
        }}
      >
        <div className="min-w-0">
          <p className="text-xs text-fg-tertiary truncate">Workspace Concierge</p>
        </div>

        <button
          type="button"
          className="text-xs px-2.5 py-1.5 rounded-lg text-fg-secondary transition-colors"
          style={{ backgroundColor: 'rgb(var(--bg-secondary))' }}
          onClick={() => setShowAssumptions((v) => !v)}
        >
          {showAssumptions ? "Hide" : "Show"} info
        </button>
      </div>

      {showAssumptions && (
        <div 
          className="px-4 py-3 border-b"
          style={{ 
            backgroundColor: 'rgb(var(--bg-secondary))',
            borderBottomColor: 'rgb(var(--border-medium))',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid'
          }}
        >
          <div className="w-full">
            <p className="text-xs text-fg-tertiary leading-relaxed">
              This chat is project-scoped. Predictions are best-effort; treat them as guidance and verify against task data.
            </p>
            <p className="text-xs text-fg-tertiary mt-1">Confidence: not yet implemented (placeholder).</p>
            <p className="text-xs text-fg-tertiary mt-1">Data sources: tasks + project metadata (as available).</p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6" style={{ backgroundColor: 'rgb(var(--bg-primary))' }}>
        <div className="w-full space-y-4">
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
                      ? "max-w-[85%] rounded-2xl rounded-br-md text-white px-4 py-2.5 shadow-sm"
                      : "max-w-[85%] rounded-2xl rounded-bl-md text-fg-primary px-4 py-2.5 shadow-sm"
                  }
                  style={{
                    backgroundColor: m.role === "user" 
                      ? 'rgb(var(--accent-primary))' 
                      : 'rgb(var(--bg-secondary))'
                  }}
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
                    <div className={
                      m.role === "agent"
                        ? "kairos-chat-response text-sm leading-relaxed"
                        : "whitespace-pre-wrap text-sm leading-relaxed"
                    }>{m.text}</div>
                  </button>

                  {m.role === "agent" && m.actions?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {m.actions.map((a, aIdx) => {
                        if (a.type === "notes_confirm") {
                          return (
                            <button
                              key={`${a.type}-${a.draftId}-${aIdx}`}
                              type="button"
                              className="text-xs px-3 py-1.5 rounded-lg text-fg-primary"
                              style={{ backgroundColor: 'rgb(var(--bg-tertiary))' }}
                              disabled={notesConfirmMutation.isPending}
                              onClick={async () => {
                                try {
                                  const res = await notesConfirmMutation.mutateAsync({ draftId: a.draftId }) as ConfirmResponse;
                                  const token = res.confirmationToken;
                                  const summary = res.summary;

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
                              className="text-xs px-3 py-1.5 rounded-lg text-white"
                              style={{ backgroundColor: 'rgb(var(--accent-primary))' }}
                              disabled={notesApplyMutation.isPending}
                              onClick={async () => {
                                const res = await notesApplyMutation.mutateAsync({
                                  draftId: a.draftId,
                                  confirmationToken: a.confirmationToken,
                                }) as ApplyResponse;

                                const results = res.results;
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

                        if (a.type === "events_confirm") {
                          return (
                            <button
                              key={`${a.type}-${a.draftId}-${aIdx}`}
                              type="button"
                              className="text-xs px-3 py-1.5 rounded-lg text-fg-primary"
                              style={{ backgroundColor: 'rgb(var(--bg-tertiary))' }}
                              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                              disabled={eventsConfirmMutation.isPending}
                              onClick={async () => {
                                try {
                                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                  const res = await eventsConfirmMutation.mutateAsync({ draftId: a.draftId }) as ConfirmResponse;
                                  const token = res.confirmationToken;
                                  const summary = res.summary;

                                  setMessages((prev) => {
                                    const next = [...prev];
                                    next.push({
                                      role: "agent",
                                      text: `Event plan confirmed. Summary: ${JSON.stringify(summary)}`,
                                      createdAt: new Date(),
                                      actions: [{ type: "events_apply", draftId: a.draftId, confirmationToken: token }],
                                    });
                                    return next;
                                  });
                                } catch (err) {
                                  const msg = err instanceof Error ? err.message : "Confirm failed";
                                  setMessages((prev) => {
                                    const next = [...prev];
                                    next.push({
                                      role: "agent",
                                      text: msg.includes("status=confirmed")
                                        ? "This event plan was already confirmed. Use Apply."
                                        : `Confirm failed: ${msg}`,
                                      createdAt: new Date(),
                                    });
                                    return next;
                                  });
                                }
                              }}
                            >
                              Confirm Event Plan
                            </button>
                          );
                        }

                        if (a.type === "events_apply") {
                          return (
                            <button
                              key={`${a.type}-${a.draftId}-${aIdx}`}
                              type="button"
                              className="text-xs px-3 py-1.5 rounded-lg text-white"
                              style={{ backgroundColor: 'rgb(var(--accent-primary))' }}
                              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                              disabled={eventsApplyMutation.isPending}
                              onClick={async () => {
                                try {
                                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                  const res = await eventsApplyMutation.mutateAsync({
                                    draftId: a.draftId,
                                    confirmationToken: a.confirmationToken,
                                  }) as ApplyResponse;
                                  const results = res.results;
                                  setMessages((prev) => [
                                    ...prev,
                                    {
                                      role: "agent",
                                      text: `Event plan applied. Result: ${JSON.stringify(results)}`,
                                      createdAt: new Date(),
                                    },
                                  ]);
                                } catch (err) {
                                  const msg = err instanceof Error ? err.message : "Apply failed";
                                  setMessages((prev) => [
                                    ...prev,
                                    { role: "agent", text: `Apply failed: ${msg}`, createdAt: new Date() },
                                  ]);
                                }
                              }}
                            >
                              Apply Event Plan
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
        className="shrink-0 border-t"
        style={{ 
          backgroundColor: 'rgb(var(--bg-primary))',
          borderTopColor: 'rgb(var(--border-medium))',
          borderTopWidth: '1px',
          borderTopStyle: 'solid'
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft);
        }}
      >
        <div className="w-full px-4 py-4">
          <div className="flex items-end gap-2 rounded-[999px] px-3 py-2 shadow-sm" style={{ backgroundColor: 'rgb(var(--bg-secondary))' }}>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message KAIROS AI…"
              className="flex-1 bg-transparent px-2 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className="h-10 shrink-0 px-4 rounded-full text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-white"
              style={{
                backgroundColor: !isAnyMutationPending() && draft.trim()
                  ? 'rgb(var(--accent-primary))'
                  : 'rgb(var(--bg-tertiary))'
              }}
              disabled={isAnyMutationPending() || !draft.trim()}
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-[11px] text-fg-tertiary text-center">
            A1 routes projects/tasks, A3 handles notes, A4 manages events. Verify critical decisions.
          </p>
        </div>
      </form>
    </div>
  );
}