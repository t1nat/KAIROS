"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { Sparkles, Copy, Check, CheckCircle2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface InlineTask {
  title: string;
  priority?: string;
}

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
        | { type: "task_confirm"; draftId: string }
        | { type: "task_apply"; draftId: string; confirmationToken: string }
      >;
      inlineTasks?: InlineTask[];
    };

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

interface TaskPlannerDraftResponse {
  draftId?: string;
  plan?: {
    creates?: unknown[];
    updates?: unknown[];
    statusChanges?: unknown[];
    deletes?: unknown[];
    risks?: string[];
    questionsForUser?: string[];
    diffPreview?: {
      creates?: string[];
      updates?: string[];
      statusChanges?: string[];
      deletes?: string[];
    };
    orderingRationale?: string;
  };
}

interface TaskPlannerConfirmResponse {
  confirmationToken: string;
  summary?: {
    creates: number;
    updates: number;
    statusChanges: number;
    deletes: number;
  };
}

interface TaskPlannerApplyResponse {
  applied?: boolean;
  results?: {
    createdTaskIds?: number[];
    updatedTaskIds?: number[];
    statusChangedTaskIds?: number[];
    deletedTaskIds?: number[];
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const THINKING_SENTINEL = "__THINKING__";
const SUBAGENT_SENTINEL = "__SUBAGENT__";

function clampText(s: string, max = 20_000): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

const GREETING_PATTERNS =
  /^\s*(hi|hello|hey|howdy|yo|hola|sup|what'?s\s*up|good\s*(morning|afternoon|evening|day)|greetings|salut|bonjour|hallo|привет|здравейте|здрасти|здравей)\b/i;

/** Replace the LAST thinking/sub-agent sentinel in messages with a real message. */
function replaceThinking(
  prev: ChatMsg[],
  msg: Omit<ChatMsg & { role: "agent" }, "role">,
): ChatMsg[] {
  const next = [...prev];
  for (let i = next.length - 1; i >= 0; i--) {
    const m = next[i];
    if (
      m?.role === "agent" &&
      (m.text === THINKING_SENTINEL || m.text === SUBAGENT_SENTINEL)
    ) {
      next[i] = { role: "agent", ...msg };
      return next;
    }
  }
  return [...next, { role: "agent", ...msg }];
}

/* ------------------------------------------------------------------ */
/*  Thinking Dots                                                     */
/* ------------------------------------------------------------------ */

function ThinkingDots() {
  return (
    <div className="kairos-thinking-dots" data-testid="thinking-indicator">
      <span />
      <span />
      <span />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-Agent Working Indicator                                       */
/* ------------------------------------------------------------------ */

function SubAgentWorking({ label }: { label: string }) {
  return (
    <div className="kairos-subagent-working" data-testid="subagent-indicator">
      <span className="kairos-subagent-label">{label}</span>
      <div className="kairos-subagent-track">
        <span />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline Task Card                                                  */
/* ------------------------------------------------------------------ */

function InlineTaskCard({ task, index }: { task: InlineTask; index: number }) {
  return (
    <div
      className="kairos-inline-task"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid="inline-task"
    >
      <span className="kairos-task-check">
        <CheckCircle2 size={11} />
      </span>
      <span className="flex-1 truncate">{task.title}</span>
      {task.priority && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: "rgb(var(--accent-primary) / 0.1)",
            color: "rgb(var(--accent-primary))",
          }}
        >
          {task.priority}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Copy Button                                                       */
/* ------------------------------------------------------------------ */

function CopyButton({ text, tooltip }: { text: string; tooltip: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silently fail
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-white/10 text-fg-tertiary hover:text-fg-secondary shrink-0"
      title={tooltip}
    >
      {copied ? (
        <Check size={13} className="text-success" />
      ) : (
        <Copy size={13} />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function ProjectIntelligenceChat(props: { projectId?: number }) {
  const { projectId } = props;
  const t = useTranslations("chat");

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showAssumptions, setShowAssumptions] = useState(false);

  /* ---- Greeting responses (i18n) ---- */
  const greetingResponses = [
    t("greeting1"),
    t("greeting2"),
    t("greeting3"),
    t("greeting4"),
  ];

  const suggestedQuestions = [
    t("suggestedQ1"),
    t("suggestedQ2"),
    t("suggestedQ3"),
    t("suggestedQ4"),
  ];

  function getGreetingResponse(): string {
    return greetingResponses[
      Math.floor(Math.random() * greetingResponses.length)
    ]!;
  }

  /* ---------- A1 Mutation (general workspace chat) ---------- */

  const a1Mutation = api.agent.projectChatbot.useMutation({
    onMutate: ({ message }) => {
      const userText = message.trim();
      if (!userText) return;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: userText, createdAt: new Date() },
        { role: "agent", text: THINKING_SENTINEL, createdAt: new Date() },
      ]);

      setDraft("");
    },
    onError: (err) => {
      setMessages((prev) =>
        replaceThinking(prev, {
          text: t("somethingWentWrong", { error: err.message }),
          createdAt: new Date(),
        }),
      );
    },
    onSuccess: (data) => {
      const output = (data as unknown as { outputJson?: unknown })
        .outputJson as
        | {
            answer?: { summary: string; details?: string[] };
            handoff?: {
              targetAgent: string;
              userIntent: string;
              context?: Record<string, unknown>;
            };
            draftPlan?: {
              proposedChanges?: Array<{ summary: string }>;
            };
          }
        | undefined;

      /* ---- A1 returned a handoff to task_planner → auto-execute ---- */
      if (output?.handoff?.targetAgent === "task_planner") {
        // Replace thinking with "Handing off..." message, then run task planner
        setMessages((prev) =>
          replaceThinking(prev, {
            text: t("handoffTaskPlanner"),
            createdAt: new Date(),
          }),
        );
        // Start the task planner pipeline
        void runTaskPlannerPipeline(
          output.handoff.userIntent,
          output.handoff.context,
        );
        return;
      }

      const agentText = output?.answer?.summary
        ? [
            output.answer.summary,
            ...(output.answer.details ?? []).map((d) => `\u2022 ${d}`),
          ].join("\n")
        : output?.handoff
          ? `I can hand this off to ${output.handoff.targetAgent}: ${output.handoff.userIntent}`
          : output?.draftPlan?.proposedChanges?.length
            ? output.draftPlan.proposedChanges
                .map((c) => `\u2022 ${c.summary}`)
                .join("\n")
            : t("noResponse");

      setMessages((prev) =>
        replaceThinking(prev, { text: agentText, createdAt: new Date() }),
      );
    },
  });

  /* ---------- Notes & Events mutations ---------- */

  const notesDraftMutation = api.agent.notesVaultDraft.useMutation();
  const notesConfirmMutation = api.agent.notesVaultConfirm.useMutation();
  const notesApplyMutation = api.agent.notesVaultApply.useMutation();

  const eventsDraftMutation = api.agent.eventsPublisherDraft.useMutation();
  const eventsConfirmMutation = api.agent.eventsPublisherConfirm.useMutation();
  const eventsApplyMutation = api.agent.eventsPublisherApply.useMutation();

  /* ---------- Task Planner mutations ---------- */

  const taskDraftMutation = api.agent.taskPlannerDraft.useMutation();
  const taskConfirmMutation = api.agent.taskPlannerConfirm.useMutation();
  const taskApplyMutation = api.agent.taskPlannerApply.useMutation();

  /* ---------- Intent detection ---------- */

  const isTaskIntent = useCallback((text: string) => {
    const t = text.toLowerCase();
    return (
      t.includes("build task") ||
      t.includes("create task") ||
      t.includes("generate task") ||
      t.includes("plan task") ||
      t.includes("add task") ||
      t.includes("break down") ||
      t.includes("break it down") ||
      t.includes("make task") ||
      t.includes("build the task") ||
      t.includes("create the task") ||
      t.includes("tasks for") ||
      t.includes("tasks into") ||
      t.includes("task breakdown") ||
      t.includes("task plan") ||
      // Extended phrases
      t.includes("build me task") ||
      t.includes("create me task") ||
      t.includes("hand it off") ||
      t.includes("hand off") ||
      // Bulgarian
      t.includes("създай задач") ||
      t.includes("генерирай задач") ||
      t.includes("планирай задач") ||
      t.includes("добави задач") ||
      t.includes("раздели на задач") ||
      // Spanish
      t.includes("crear tarea") ||
      t.includes("generar tarea") ||
      t.includes("planificar tarea") ||
      t.includes("añadir tarea") ||
      t.includes("desglosar") ||
      // French
      t.includes("créer des tâche") ||
      t.includes("générer des tâche") ||
      t.includes("planifier des tâche") ||
      t.includes("ajouter des tâche") ||
      t.includes("découper") ||
      // German
      t.includes("aufgaben erstellen") ||
      t.includes("aufgaben generieren") ||
      t.includes("aufgaben planen") ||
      t.includes("aufgaben hinzufügen") ||
      t.includes("aufteilen")
    );
  }, []);

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

  /* ---------- Task Planner Pipeline (auto draft → confirm → apply) ---------- */

  const runTaskPlannerPipeline = useCallback(
    async (
      userMessage: string,
      handoffContext?: Record<string, unknown>,
    ) => {
      // Show a sub-agent working indicator (distinct from normal thinking)
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: SUBAGENT_SENTINEL, createdAt: new Date() },
      ]);

      try {
        /* Step 1: Draft */
        const draftRes = (await taskDraftMutation.mutateAsync({
          message: clampText(userMessage),
          scope: projectId ? { projectId } : undefined,
          handoffContext,
        })) as TaskPlannerDraftResponse;

        const plan = draftRes?.plan;
        const draftId = draftRes?.draftId ?? "";

        const creates = Array.isArray(plan?.creates)
          ? plan.creates.length
          : 0;
        const updates = Array.isArray(plan?.updates)
          ? plan.updates.length
          : 0;
        const statusChanges = Array.isArray(plan?.statusChanges)
          ? plan.statusChanges.length
          : 0;
        const deletes = Array.isArray(plan?.deletes)
          ? plan.deletes.length
          : 0;
        const questions = Array.isArray(plan?.questionsForUser)
          ? plan.questionsForUser
          : [];

        // If the planner has questions, show them and stop
        if (questions.length > 0) {
          const qText = `${t("needMoreInfo")}\n${questions.map((q) => `\u2022 ${q}`).join("\n")}`;
          setMessages((prev) =>
            replaceThinking(prev, { text: qText, createdAt: new Date() }),
          );
          return;
        }

        const totalOps = creates + updates + statusChanges + deletes;

        if (totalOps === 0 || !draftId) {
          setMessages((prev) =>
            replaceThinking(prev, {
              text: t("noChanges"),
              createdAt: new Date(),
            }),
          );
          return;
        }

        /* Step 2: Confirm */
        const confirmRes = (await taskConfirmMutation.mutateAsync({
          draftId,
        })) as TaskPlannerConfirmResponse;

        const token = confirmRes.confirmationToken;

        /* Step 3: Apply */
        const applyRes = (await taskApplyMutation.mutateAsync({
          draftId,
          confirmationToken: token,
        })) as TaskPlannerApplyResponse;

        const createdCount =
          applyRes?.results?.createdTaskIds?.length ?? creates;
        const totalApplied =
          (applyRes?.results?.createdTaskIds?.length ?? 0) +
          (applyRes?.results?.updatedTaskIds?.length ?? 0) +
          (applyRes?.results?.statusChangedTaskIds?.length ?? 0) +
          (applyRes?.results?.deletedTaskIds?.length ?? 0);

        const doneText =
          createdCount > 0
            ? t("taskPlannerDone", { count: createdCount })
            : totalApplied > 0
              ? t("taskPlannerDoneNoCount")
              : t("noChanges");

        // Extract task titles from the draft plan for inline display
        const inlineTasks: InlineTask[] = Array.isArray(plan?.creates)
          ? (plan.creates as Array<{ title?: string; priority?: string }>)
              .filter((c) => typeof c?.title === "string")
              .map((c) => ({
                title: c.title!,
                priority: c.priority,
              }))
          : [];

        setMessages((prev) =>
          replaceThinking(prev, {
            text: doneText,
            createdAt: new Date(),
            inlineTasks: inlineTasks.length > 0 ? inlineTasks : undefined,
          }),
        );
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) =>
          replaceThinking(prev, {
            text: t("taskPlannerFailed", { error: errMsg }),
            createdAt: new Date(),
          }),
        );
      }
    },
    [
      projectId,
      t,
      taskDraftMutation,
      taskConfirmMutation,
      taskApplyMutation,
    ],
  );

  /* ---------- Scrolling ---------- */

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo?.({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /* ---------- Send handler ---------- */

  const handleSend = useCallback(
    (text: string) => {
      const msg = text.trim();
      if (!msg) return;

      setDraft("");

      // Client-side greeting detection — instant response, no API call
      if (GREETING_PATTERNS.test(msg) && msg.split(/\s+/).length <= 5) {
        setMessages((prev) => [
          ...prev,
          { role: "user", text: msg, createdAt: new Date() },
          {
            role: "agent",
            text: getGreetingResponse(),
            createdAt: new Date(),
          },
        ]);
        return;
      }

      const run = async () => {
        /* ---- Task planner path (auto draft → confirm → apply) ---- */
        if (isTaskIntent(msg)) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: msg, createdAt: new Date() },
            {
              role: "agent",
              text: t("handoffTaskPlanner"),
              createdAt: new Date(),
            },
          ]);

          await runTaskPlannerPipeline(msg);
          return;
        }

        /* ---- Events path ---- */
        if (isEventsIntent(msg)) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: msg, createdAt: new Date() },
            {
              role: "agent",
              text: THINKING_SENTINEL,
              createdAt: new Date(),
            },
          ]);

          try {
            const res = (await eventsDraftMutation.mutateAsync({
              message: clampText(msg),
            })) as EventsDraftResponse;

            const plan = res?.plan;
            const draftId = res?.draftId ?? "";

            const creates = Array.isArray(plan?.creates)
              ? plan.creates.length
              : 0;
            const updates = Array.isArray(plan?.updates)
              ? plan.updates.length
              : 0;
            const deletes = Array.isArray(plan?.deletes)
              ? plan.deletes.length
              : 0;
            const questions = Array.isArray(plan?.questionsForUser)
              ? plan.questionsForUser
              : [];

            let agentText: string;
            if (questions.length > 0) {
              agentText = `${t("needMoreInfo")}\n${questions.map((q) => `\u2022 ${q}`).join("\n")}`;
            } else {
              const summaryLine =
                plan?.summary ?? "Here\u2019s what I\u2019ll do:";
              const ops = [
                creates > 0 ? t("createOps", { count: creates }) : null,
                updates > 0 ? t("updateOps", { count: updates }) : null,
                deletes > 0 ? t("deleteOps", { count: deletes }) : null,
              ]
                .filter(Boolean)
                .join(" \u00b7 ");
              agentText = [
                summaryLine,
                ops || t("noChanges"),
                creates + updates + deletes > 0 ? t("clickConfirm") : "",
              ]
                .filter(Boolean)
                .join("\n");
            }

            const hasOps = creates + updates + deletes > 0;

            setMessages((prev) =>
              replaceThinking(prev, {
                text: agentText,
                createdAt: new Date(),
                actions:
                  hasOps && draftId
                    ? [{ type: "events_confirm", draftId }]
                    : undefined,
              }),
            );
          } catch (err) {
            const errMsg =
              err instanceof Error ? err.message : "Events request failed";
            setMessages((prev) =>
              replaceThinking(prev, {
                text: t("somethingWentWrong", { error: errMsg }),
                createdAt: new Date(),
              }),
            );
          }

          return;
        }

        /* ---- Notes path ---- */
        if (isNotesIntent(msg)) {
          setMessages((prev) => [
            ...prev,
            { role: "user", text: msg, createdAt: new Date() },
            {
              role: "agent",
              text: THINKING_SENTINEL,
              createdAt: new Date(),
            },
          ]);

          try {
            const res = (await notesDraftMutation.mutateAsync({
              message: clampText(msg),
            })) as NotesDraftResponse;

            const plan = res?.plan;
            const draftId = res?.draftId ?? "";

            const operations = Array.isArray(plan?.operations)
              ? plan.operations
              : [];
            const blocked = Array.isArray(plan?.blocked) ? plan.blocked : [];

            const creates = operations.filter(
              (o) =>
                (o as Record<string, unknown>)?.type === "create",
            ).length;
            const updates = operations.filter(
              (o) =>
                (o as Record<string, unknown>)?.type === "update",
            ).length;
            const deletes = operations.filter(
              (o) =>
                (o as Record<string, unknown>)?.type === "delete",
            ).length;

            const chatbotSummary =
              creates > 0
                ? t("noteCreate")
                : updates > 0
                  ? t("noteUpdate")
                  : deletes > 0
                    ? t("noteDelete")
                    : t("noNoteChanges");

            const ops = [
              creates > 0 ? t("createOps", { count: creates }) : null,
              updates > 0 ? t("updateOps", { count: updates }) : null,
              deletes > 0 ? t("deleteOps", { count: deletes }) : null,
              blocked.length > 0
                ? t("blockedOps", { count: blocked.length })
                : null,
            ]
              .filter(Boolean)
              .join(" \u00b7 ");

            const agentText = [
              chatbotSummary,
              ops,
              operations.length > 0 ? t("clickConfirm") : "",
            ]
              .filter(Boolean)
              .join("\n");

            const shouldShowConfirm = operations.length > 0;

            setMessages((prev) =>
              replaceThinking(prev, {
                text: agentText,
                createdAt: new Date(),
                actions:
                  shouldShowConfirm && draftId
                    ? [{ type: "notes_confirm", draftId }]
                    : undefined,
              }),
            );
          } catch (err) {
            const errMsg =
              err instanceof Error ? err.message : "Notes request failed";
            setMessages((prev) =>
              replaceThinking(prev, {
                text: t("somethingWentWrong", { error: errMsg }),
                createdAt: new Date(),
              }),
            );
          }

          return;
        }

        /* ---- Default: A1 workspace chatbot ---- */
        await a1Mutation.mutateAsync({
          projectId,
          message: clampText(msg),
        });
      };

      void run();
    },
    [
      projectId,
      t,
      a1Mutation,
      isTaskIntent,
      isNotesIntent,
      isEventsIntent,
      notesDraftMutation,
      eventsDraftMutation,
      runTaskPlannerPipeline,
    ],
  );

  /* ---------- Derived state ---------- */

  const isAnyMutationPending = (): boolean => {
    const eventsPending =
      Boolean(eventsDraftMutation.isPending) ||
      Boolean(eventsConfirmMutation.isPending) ||
      Boolean(eventsApplyMutation.isPending);
    const taskPending =
      Boolean(taskDraftMutation.isPending) ||
      Boolean(taskConfirmMutation.isPending) ||
      Boolean(taskApplyMutation.isPending);
    return (
      Boolean(a1Mutation.isPending) ||
      Boolean(notesDraftMutation.isPending) ||
      Boolean(notesConfirmMutation.isPending) ||
      Boolean(notesApplyMutation.isPending) ||
      eventsPending ||
      taskPending
    );
  };

  const isThinking =
    messages.length > 0 &&
    (messages[messages.length - 1]?.text === THINKING_SENTINEL ||
     messages[messages.length - 1]?.text === SUBAGENT_SENTINEL);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className="h-full w-full flex flex-col"
      style={{ backgroundColor: "rgb(var(--bg-primary))" }}
    >
      {/* ---- Header ---- */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 border-b"
        style={{
          backgroundColor: "rgb(var(--bg-primary))",
          borderBottomColor: "rgb(var(--border-medium))",
          borderBottomWidth: "1px",
          borderBottomStyle: "solid",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "rgb(var(--accent-primary) / 0.15)",
            }}
          >
            <Sparkles
              size={13}
              style={{ color: "rgb(var(--accent-primary))" }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-fg-primary truncate">
              {t("title")}
            </p>
            <p className="text-[10px] text-fg-tertiary truncate">
              {messages.length > 0 &&
               messages[messages.length - 1]?.text === SUBAGENT_SENTINEL
                ? t("taskPlannerWorking")
                : isThinking
                  ? t("thinking")
                  : t("subtitle")}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="text-xs px-2.5 py-1.5 rounded-lg text-fg-secondary transition-colors hover:text-fg-primary"
          style={{ backgroundColor: "rgb(var(--bg-secondary))" }}
          onClick={() => setShowAssumptions((v) => !v)}
        >
          {showAssumptions ? t("hide") : t("info")}
        </button>
      </div>

      {showAssumptions && (
        <div
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: "rgb(var(--bg-secondary))",
            borderBottomColor: "rgb(var(--border-medium))",
            borderBottomWidth: "1px",
            borderBottomStyle: "solid",
          }}
        >
          <div className="w-full space-y-1">
            <p className="text-xs text-fg-tertiary leading-relaxed">
              {t("infoDesc")}
            </p>
            <p className="text-xs text-fg-tertiary">{t("infoCaps")}</p>
          </div>
        </div>
      )}

      {/* ---- Messages ---- */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-6"
        style={{ backgroundColor: "rgb(var(--bg-primary))" }}
      >
        <div className="w-full space-y-3">
          {messages.length === 0 ? (
            <div className="py-8 text-center space-y-5">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mx-auto"
                style={{
                  backgroundColor: "rgb(var(--accent-primary) / 0.1)",
                }}
              >
                <Sparkles
                  size={22}
                  style={{ color: "rgb(var(--accent-primary))" }}
                />
              </div>
              <div>
                <p className="text-sm text-fg-secondary font-medium mb-1">
                  {t("emptyTitle")}
                </p>
                <p className="text-xs text-fg-tertiary">
                  {t("emptySubtitle")}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="text-[11px] px-3 py-1.5 rounded-full border transition-all hover:scale-[1.03]"
                    style={{
                      borderColor:
                        "rgb(var(--accent-primary) / 0.2)",
                      color: "rgb(var(--accent-primary))",
                      backgroundColor:
                        "rgb(var(--accent-primary) / 0.06)",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, idx) => {
              const isThinkingMsg =
                m.role === "agent" && m.text === THINKING_SENTINEL;
              const isSubAgentMsg =
                m.role === "agent" && m.text === SUBAGENT_SENTINEL;
              const hasInlineTasks =
                m.role === "agent" &&
                Array.isArray((m as { inlineTasks?: InlineTask[] }).inlineTasks) &&
                ((m as { inlineTasks?: InlineTask[] }).inlineTasks?.length ?? 0) > 0;

              return (
                <div
                  key={`${m.createdAt.toISOString()}-${idx}`}
                  className={`kairos-msg-enter ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "group max-w-[85%] rounded-2xl rounded-br-md text-white px-4 py-2.5 shadow-sm"
                        : "group max-w-[85%] rounded-2xl rounded-bl-md text-fg-primary px-4 py-2.5 shadow-sm"
                    }
                    style={{
                      backgroundColor:
                        m.role === "user"
                          ? "rgb(var(--accent-primary))"
                          : "rgb(var(--bg-secondary))",
                    }}
                  >
                    {/* Message content */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {isThinkingMsg ? (
                          <div className="kairos-chat-response text-sm leading-relaxed py-1">
                            <span className="sr-only">
                              {t("thinking")}
                            </span>
                            <ThinkingDots />
                          </div>
                        ) : isSubAgentMsg ? (
                          <div className="kairos-chat-response text-sm leading-relaxed py-1">
                            <span className="sr-only">
                              {t("taskPlannerWorking")}
                            </span>
                            <SubAgentWorking
                              label={t("taskPlannerWorking")}
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="w-full text-left"
                            title={t("copyTooltip")}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  m.text,
                                );
                              } catch {
                                // silently fail
                              }
                            }}
                          >
                            <div
                              className={
                                m.role === "agent"
                                  ? "kairos-chat-response text-sm leading-relaxed"
                                  : "whitespace-pre-wrap text-sm leading-relaxed"
                              }
                            >
                              {m.text}
                            </div>
                          </button>
                        )}
                      </div>

                      {/* Copy icon for agent messages */}
                      {!isThinkingMsg && !isSubAgentMsg && m.role === "agent" && (
                        <CopyButton
                          text={m.text}
                          tooltip={t("copyTooltip")}
                        />
                      )}
                    </div>

                    {/* Inline tasks (shown after task planner creates tasks) */}
                    {hasInlineTasks && (
                      <div className="kairos-inline-tasks" data-testid="inline-tasks">
                        {(
                          (m as { inlineTasks?: InlineTask[] })
                            .inlineTasks ?? []
                        ).map((task, tIdx) => (
                          <InlineTaskCard
                            key={`task-${tIdx}`}
                            task={task}
                            index={tIdx}
                          />
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    {m.role === "agent" && m.actions?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {m.actions.map((a, aIdx) => {
                          /* ---- Notes Confirm ---- */
                          if (a.type === "notes_confirm") {
                            return (
                              <button
                                key={`${a.type}-${a.draftId}-${aIdx}`}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-[1.03] active:scale-95"
                                style={{
                                  backgroundColor:
                                    "rgb(var(--accent-primary) / 0.15)",
                                  color:
                                    "rgb(var(--accent-primary))",
                                }}
                                disabled={
                                  notesConfirmMutation.isPending
                                }
                                onClick={async () => {
                                  try {
                                    const res =
                                      (await notesConfirmMutation.mutateAsync(
                                        {
                                          draftId: a.draftId,
                                        },
                                      )) as ConfirmResponse;
                                    const token =
                                      res.confirmationToken;
                                    const summary = res.summary;

                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: t("notesConfirmed", {
                                          summary:
                                            typeof summary ===
                                            "string"
                                              ? summary
                                              : t("readyToApply"),
                                        }),
                                        createdAt: new Date(),
                                        actions: [
                                          {
                                            type: "notes_apply",
                                            draftId: a.draftId,
                                            confirmationToken:
                                              token,
                                          },
                                        ],
                                      },
                                    ]);
                                  } catch (err) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : typeof err === "string"
                                          ? err
                                          : "Confirm failed";

                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: msg.includes(
                                          "status=confirmed",
                                        )
                                          ? t("alreadyConfirmed")
                                          : t("confirmFailed", {
                                              error: msg,
                                            }),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {notesConfirmMutation.isPending
                                  ? t("confirming")
                                  : t("confirm")}
                              </button>
                            );
                          }

                          /* ---- Notes Apply ---- */
                          if (a.type === "notes_apply") {
                            return (
                              <button
                                key={`${a.type}-${a.draftId}-${aIdx}`}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg text-white transition-all hover:scale-[1.03] active:scale-95"
                                style={{
                                  backgroundColor:
                                    "rgb(var(--accent-primary))",
                                }}
                                disabled={
                                  notesApplyMutation.isPending
                                }
                                onClick={async () => {
                                  try {
                                    const res =
                                      (await notesApplyMutation.mutateAsync(
                                        {
                                          draftId: a.draftId,
                                          confirmationToken:
                                            a.confirmationToken,
                                        },
                                      )) as ApplyResponse;
                                    const results = res.results;
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: `${t("notesDone")}${results ? ` (${typeof results === "object" ? Object.keys(results as Record<string, unknown>).length : 1} operations)` : ""}`,
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  } catch (err) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : "Apply failed";
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: t("applyFailed", {
                                          error: msg,
                                        }),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {notesApplyMutation.isPending
                                  ? t("applying")
                                  : t("apply")}
                              </button>
                            );
                          }

                          /* ---- Events Confirm ---- */
                          if (a.type === "events_confirm") {
                            return (
                              <button
                                key={`${a.type}-${a.draftId}-${aIdx}`}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-[1.03] active:scale-95"
                                style={{
                                  backgroundColor:
                                    "rgb(var(--accent-primary) / 0.15)",
                                  color:
                                    "rgb(var(--accent-primary))",
                                }}
                                disabled={
                                  eventsConfirmMutation.isPending
                                }
                                onClick={async () => {
                                  try {
                                    const res =
                                      (await eventsConfirmMutation.mutateAsync(
                                        {
                                          draftId: a.draftId,
                                        },
                                      )) as ConfirmResponse;
                                    const token =
                                      res.confirmationToken;
                                    const summary = res.summary;

                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: t("eventsConfirmed", {
                                          summary:
                                            typeof summary ===
                                            "string"
                                              ? summary
                                              : t("readyToApply"),
                                        }),
                                        createdAt: new Date(),
                                        actions: [
                                          {
                                            type: "events_apply",
                                            draftId: a.draftId,
                                            confirmationToken:
                                              token,
                                          },
                                        ],
                                      },
                                    ]);
                                  } catch (err) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : "Confirm failed";
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: msg.includes(
                                          "status=confirmed",
                                        )
                                          ? t("alreadyConfirmed")
                                          : t("confirmFailed", {
                                              error: msg,
                                            }),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {eventsConfirmMutation.isPending
                                  ? t("confirming")
                                  : t("confirmEvents")}
                              </button>
                            );
                          }

                          /* ---- Events Apply ---- */
                          if (a.type === "events_apply") {
                            return (
                              <button
                                key={`${a.type}-${a.draftId}-${aIdx}`}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg text-white transition-all hover:scale-[1.03] active:scale-95"
                                style={{
                                  backgroundColor:
                                    "rgb(var(--accent-primary))",
                                }}
                                disabled={
                                  eventsApplyMutation.isPending
                                }
                                onClick={async () => {
                                  try {
                                    const res =
                                      (await eventsApplyMutation.mutateAsync(
                                        {
                                          draftId: a.draftId,
                                          confirmationToken:
                                            a.confirmationToken,
                                        },
                                      )) as ApplyResponse;
                                    const results = res.results;
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: `${t("eventsDone")}${results ? ` (${typeof results === "object" ? Object.keys(results as Record<string, unknown>).length : 1} operations)` : ""}`,
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  } catch (err) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : "Apply failed";
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: t("applyFailed", {
                                          error: msg,
                                        }),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {eventsApplyMutation.isPending
                                  ? t("applying")
                                  : t("applyEvents")}
                              </button>
                            );
                          }

                          /* ---- Task Confirm ---- */
                          if (a.type === "task_confirm") {
                            return (
                              <button
                                key={`${a.type}-${a.draftId}-${aIdx}`}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-[1.03] active:scale-95"
                                style={{
                                  backgroundColor:
                                    "rgb(var(--accent-primary) / 0.15)",
                                  color:
                                    "rgb(var(--accent-primary))",
                                }}
                                disabled={
                                  taskConfirmMutation.isPending
                                }
                                onClick={async () => {
                                  try {
                                    const res =
                                      (await taskConfirmMutation.mutateAsync(
                                        {
                                          draftId: a.draftId,
                                        },
                                      )) as TaskPlannerConfirmResponse;
                                    const token =
                                      res.confirmationToken;

                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: t("readyToApply"),
                                        createdAt: new Date(),
                                        actions: [
                                          {
                                            type: "task_apply",
                                            draftId: a.draftId,
                                            confirmationToken:
                                              token,
                                          },
                                        ],
                                      },
                                    ]);
                                  } catch (err) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : "Confirm failed";
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: msg.includes(
                                          "status=confirmed",
                                        )
                                          ? t("alreadyConfirmed")
                                          : t("confirmFailed", {
                                              error: msg,
                                            }),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {taskConfirmMutation.isPending
                                  ? t("confirming")
                                  : t("confirmTaskPlan")}
                              </button>
                            );
                          }

                          /* ---- Task Apply ---- */
                          if (a.type === "task_apply") {
                            return (
                              <button
                                key={`${a.type}-${a.draftId}-${aIdx}`}
                                type="button"
                                className="text-xs px-3 py-1.5 rounded-lg text-white transition-all hover:scale-[1.03] active:scale-95"
                                style={{
                                  backgroundColor:
                                    "rgb(var(--accent-primary))",
                                }}
                                disabled={
                                  taskApplyMutation.isPending
                                }
                                onClick={async () => {
                                  try {
                                    const res =
                                      (await taskApplyMutation.mutateAsync(
                                        {
                                          draftId: a.draftId,
                                          confirmationToken:
                                            a.confirmationToken,
                                        },
                                      )) as TaskPlannerApplyResponse;
                                    const created =
                                      res?.results?.createdTaskIds
                                        ?.length ?? 0;

                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text:
                                          created > 0
                                            ? t(
                                                "taskPlannerDone",
                                                {
                                                  count: created,
                                                },
                                              )
                                            : t(
                                                "taskPlannerDoneNoCount",
                                              ),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  } catch (err) {
                                    const msg =
                                      err instanceof Error
                                        ? err.message
                                        : "Apply failed";
                                    setMessages((prev) => [
                                      ...prev,
                                      {
                                        role: "agent",
                                        text: t("applyFailed", {
                                          error: msg,
                                        }),
                                        createdAt: new Date(),
                                      },
                                    ]);
                                  }
                                }}
                              >
                                {taskApplyMutation.isPending
                                  ? t("applying")
                                  : t("applyTaskPlan")}
                              </button>
                            );
                          }

                          return null;
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          <div className="h-2" />
        </div>
      </div>

      {/* ---- Input form ---- */}
      <form
        className="shrink-0 border-t"
        style={{
          backgroundColor: "rgb(var(--bg-primary))",
          borderTopColor: "rgb(var(--border-medium))",
          borderTopWidth: "1px",
          borderTopStyle: "solid",
        }}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(draft);
        }}
      >
        <div className="w-full px-4 py-4">
          <div
            className="flex items-end gap-2 rounded-[999px] px-3 py-2 shadow-sm"
            style={{ backgroundColor: "rgb(var(--bg-secondary))" }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("placeholder")}
              className="flex-1 bg-transparent px-2 py-2 text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus-visible:outline-none"
            />
            <button
              type="submit"
              className="h-10 shrink-0 px-4 rounded-full text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white hover:scale-[1.03] active:scale-95"
              style={{
                backgroundColor:
                  !isAnyMutationPending() && draft.trim()
                    ? "rgb(var(--accent-primary))"
                    : "rgb(var(--bg-tertiary))",
              }}
              disabled={isAnyMutationPending() || !draft.trim()}
            >
              {t("send")}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-fg-tertiary text-center">
            {t("disclaimer")}
          </p>
        </div>
      </form>
    </div>
  );
}
