"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";

type ChatMsg = {
  role: "user" | "agent";
  text: string;
  createdAt: Date;
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

  const sendMutation = api.agent.projectChatbot.useMutation({
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
        // Replace the last placeholder agent message if it exists
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i]?.role === "agent" && next[i]?.text === "Thinking…") {
            next[i] = {
              role: "agent",
              text: `Request failed: ${err.message}`,
              createdAt: new Date(),
            };
            return next;
          }
        }
        return [...next, { role: "agent", text: `Request failed: ${err.message}`, createdAt: new Date() }];
      });
    },
    onSuccess: (data) => {
      // agentOrchestrator.draft returns: { draftId, outputJson }
      // We render a human-readable answer from A1Output.
      const output = (data as unknown as { outputJson?: unknown }).outputJson as
        | {
            answer?: { summary: string; details?: string[] };
            handoff?: { targetAgent: string; userIntent: string };
            draftPlan?: { proposedChanges?: Array<{ summary: string }> };
          }
        | undefined;

      const agentText =
        output?.answer?.summary
          ? [
              output.answer.summary,
              ...(output.answer.details ?? []).map((d) => `• ${d}`),
            ].join("\n")
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
      // Keep the input editable; only the send button is disabled while pending
      void sendMutation
        .mutateAsync({ projectId, message: clampText(msg) })
        .finally(() => {
        // Best-effort scroll
        setTimeout(scrollToBottom, 0);
      });
    },
    [projectId, sendMutation, scrollToBottom],
  );

  return (
    <div className="h-full w-full flex flex-col bg-bg-primary">
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-white/10 bg-bg-primary/80 backdrop-blur">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg-primary">A1 Assistant</p>
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
        <div className="px-4 py-3 border-b border-white/10 bg-bg-primary/60 backdrop-blur">
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
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.text}</div>
                </div>
              </div>
            ))
          )}
          <div className="h-2" />
        </div>
      </div>

      <form
        className="shrink-0 border-t border-white/10 bg-bg-primary/80 backdrop-blur"
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
                (!sendMutation.isPending && draft.trim()
                  ? "text-white hover:opacity-90"
                  : "bg-bg-secondary/40 text-fg-tertiary")
              }
              disabled={sendMutation.isPending || !draft.trim()}
              style={
                !sendMutation.isPending && draft.trim()
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
