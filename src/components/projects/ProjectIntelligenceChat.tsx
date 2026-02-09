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
      // agentOrchestrator.draft returns { message, actions?, ... } (A1 schema)
      const agentText = (data as unknown as { message?: string }).message ?? "(no response)";
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

  const suggestedActions = useMemo(
    () => [
      "How far along is this project?",
      "What are the biggest risks right now?",
      "Will we hit our deadline?",
      "Summarize what to do next week.",
    ],
    [],
  );

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
    <div className="surface-card overflow-hidden flex flex-col h-full min-h-[420px] shadow-lg">
      <div className="px-4 py-3 border-b border-border-light/20 flex items-center justify-between gap-3 bg-gradient-to-r from-bg-elevated to-bg-surface">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg-primary">Project / Workspace Intelligence</p>
          <p className="text-xs text-fg-tertiary truncate">Ask about progress, risks, deadlines, and next steps.</p>
        </div>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded-md border border-border-light/30 hover:bg-bg-surface text-fg-secondary"
          onClick={() => setShowAssumptions((v) => !v)}
        >
          {showAssumptions ? "Hide" : "Show"} assumptions
        </button>
      </div>

      {showAssumptions && (
        <div className="px-4 py-3 border-b border-border-light/20 bg-bg-elevated/40">
          <p className="text-xs text-fg-tertiary">
            This chat is project-scoped. Predictions are best-effort; treat them as guidance and verify against task
            data.
          </p>
          <p className="text-xs text-fg-tertiary mt-1">Confidence: not yet implemented (placeholder).</p>
          <p className="text-xs text-fg-tertiary mt-1">Data sources: tasks + project metadata (as available).</p>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 bg-gradient-to-b from-bg-surface/20 to-bg-primary">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-fg-tertiary">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedActions.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="text-xs px-3 py-1.5 rounded-full border border-border-light/30 hover:bg-bg-surface text-fg-secondary"
                  onClick={() => handleSend(s)}
                  disabled={sendMutation.isPending}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, idx) => (
              <div key={`${m.createdAt.toISOString()}-${idx}`} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={
                    m.role === "user"
                      ? "inline-block max-w-[85%] px-3 py-2 rounded-2xl bg-accent-primary/20 text-fg-primary"
                      : "inline-block max-w-[85%] px-3 py-2 rounded-2xl bg-bg-elevated/70 text-fg-primary"
                  }
                >
                  <div className="whitespace-pre-wrap text-sm">{m.text}</div>
                  <div className="text-[10px] mt-1 text-fg-tertiary">{m.createdAt.toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        className="p-3 border-t border-border-light/20 flex items-center gap-2 bg-bg-elevated/50"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft);
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this project…"
          className="flex-1 px-3 py-2 rounded-lg bg-bg-surface border border-border-light/30 text-fg-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
        />
        <button
          type="submit"
          className="px-3 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium disabled:opacity-60"
          disabled={sendMutation.isPending || !draft.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}
