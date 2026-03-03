"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRolePermissions } from "~/lib/useRolePermissions";
import {
  Plus,
  Sparkles,
  Upload,
  Calendar,
  User,
  UserPlus,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Shield,
  Eye,
  Edit3,
} from "lucide-react";

/* ─── Types ─── */

type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";
type TaskPriority = "low" | "medium" | "high" | "urgent";

type ProjectCard = {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  tasks: Array<{ id: number; status: TaskStatus; dueDate: Date | null }>;
};

type OrgActivityEntry = {
  id: number;
  taskId: number;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  taskTitle: string;
  projectId: number;
  projectTitle: string;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type OrgActivityResponse = {
  scope: "organization" | "personal";
  rows: OrgActivityEntry[];
};

type GeneratedTask = {
  title: string;
  description?: string;
  priority: TaskPriority;
  orderIndex: number;
  estimatedDueDays?: number;
};

type GenerateTaskDraftsResult = {
  draftId: string;
  tasks: GeneratedTask[];
  reasoning: string;
  projectTitle: string;
  projectDescription?: string;
};

type OrgMember = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  joinedAt: Date;
};

/* ─── Typed API wrapper (same pattern as ProgressFeedClient) ─── */
const typedApi = api as unknown as {
  user: {
    getProfile: {
      useQuery: (
        input?: undefined,
        opts?: { staleTime?: number; enabled?: boolean },
      ) => {
        data: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
          activeOrganizationId: number | null;
          organization: { id: number; name: string } | null;
          role: string | null;
        } | null | undefined;
        isLoading: boolean;
      };
    };
  };
  organization: {
    getMembers: {
      useQuery: (
        input: { organizationId: number },
        opts?: { staleTime?: number; enabled?: boolean },
      ) => {
        data: OrgMember[] | undefined;
        isLoading: boolean;
      };
    };
  };
  project: {
    getMyProjects: {
      useQuery: (
        input?: undefined,
        opts?: { staleTime?: number; enabled?: boolean },
      ) => { data: ProjectCard[] | undefined; isLoading: boolean; error: { message: string } | null };
    };
  };
  task: {
    getOrgActivity: {
      useQuery: (
        input: { limit: number; scope?: string },
        opts?: { staleTime?: number },
      ) => { data: OrgActivityResponse | undefined; isLoading: boolean; error: { message: string } | null };
    };
    create: {
      useMutation: (opts?: {
        onSuccess?: () => void;
        onError?: (err: { message: string }) => void;
      }) => {
        mutate: (input: {
          projectId: number;
          title: string;
          description?: string;
          priority: TaskPriority;
          dueDate?: Date;
          assignedToId?: string;
        }) => void;
        isPending: boolean;
      };
    };
    updateStatus: {
      useMutation: (opts?: {
        onSuccess?: () => void;
        onError?: (err: { message: string }) => void;
      }) => {
        mutate: (input: { taskId: number; status: TaskStatus; completionNote?: string | null }) => void;
        isPending: boolean;
      };
    };
    delete: {
      useMutation: (opts?: {
        onSuccess?: () => void;
        onError?: (err: { message: string }) => void;
      }) => {
        mutate: (input: { taskId: number }) => void;
        isPending: boolean;
      };
    };
  };
  agent: {
    generateTaskDrafts: {
      useMutation: (opts?: {
        onSuccess?: (data: GenerateTaskDraftsResult) => void;
        onError?: (err: { message: string }) => void;
      }) => {
        mutate: (input: { projectId: number; message?: string }) => void;
        isPending: boolean;
        data?: GenerateTaskDraftsResult;
      };
    };
  };
};

/* ─── Priority helpers ─── */
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  { value: "medium", label: "Medium", color: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  { value: "high", label: "High", color: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  { value: "urgent", label: "Urgent", color: "bg-red-500/15 text-red-400 border-red-500/20" },
];

/* ─── Timeline Entry ─── */
function TimelineEntry({
  entry,
  isLast,
  index,
  onToggleDone,
  onDelete,
  isToggling,
  isDeleting,
  canDelete,
}: {
  entry: OrgActivityEntry;
  isLast: boolean;
  index: number;
  onToggleDone: (taskId: number, currentlyDone: boolean) => void;
  onDelete: (taskId: number) => void;
  isToggling: boolean;
  isDeleting: boolean;
  canDelete: boolean;
}) {
  const entryRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = entryRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([e]) => { if (e?.isIntersecting) setIsVisible(true); },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const date = new Date(entry.createdAt);
  const dateStr = date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .toUpperCase();
  const isCompleted = entry.action === "status_changed" && entry.newValue === "completed";
  const isPending = entry.action === "status_changed" && entry.newValue === "pending";
  const isCreated = entry.action === "created";

  const statusLabel = isCompleted
    ? "Done"
    : isPending
      ? "Pending"
      : isCreated
        ? "Created"
        : entry.action === "status_changed"
          ? entry.newValue?.replace("_", " ") ?? "Updated"
          : "Updated";

  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      ref={entryRef}
      className="relative flex gap-4 sm:gap-6 timeline-entry-wrapper"
      style={{
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? "blur(0px)" : "blur(6px)",
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
        transition: `all 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${index * 0.06}s`,
      }}
    >
      {/* Vertical line + dot */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onToggleDone(entry.taskId, isCompleted)}
          disabled={isToggling}
          className={`w-4 h-4 rounded-full border-[3px] flex-shrink-0 z-10 transition-all duration-300 cursor-pointer hover:scale-125 ${
            isCompleted
              ? "border-emerald-400 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              : isPending
                ? "border-blue-400 bg-blue-400/30 shadow-[0_0_8px_rgba(96,165,250,0.3)] hover:bg-blue-400/50"
                : isCreated
                  ? "border-accent-primary bg-accent-primary/30 shadow-[0_0_8px_rgb(var(--accent-primary)/0.3)]"
                  : "border-fg-tertiary/40 bg-bg-primary dark:bg-bg-primary hover:border-accent-primary hover:shadow-[0_0_6px_rgb(var(--accent-primary)/0.2)]"
          }`}
          title={isCompleted ? "Mark as pending" : "Mark as done"}
        />
        {!isLast && (
          <div
            className={`w-[2px] flex-1 min-h-[60px] transition-all duration-500 ${
              isCompleted
                ? "bg-gradient-to-b from-emerald-400/60 to-emerald-400/10"
                : isPending
                  ? "bg-gradient-to-b from-blue-400/40 to-blue-400/5"
                  : isCreated
                    ? "bg-gradient-to-b from-accent-primary/40 to-accent-primary/5"
                    : "bg-gradient-to-b from-border-medium/30 to-transparent dark:from-white/[0.08] dark:to-transparent"
            }`}
          />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6 -mt-1">
        <div
          className={`timeline-card rounded-2xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
          isCompleted
            ? "border-emerald-500/30 dark:border-emerald-500/20 hover:shadow-emerald-500/10"
            : isPending
              ? "border-blue-500/30 dark:border-blue-500/20 hover:shadow-blue-500/10"
              : isCreated
                ? "border-accent-primary/30 dark:border-accent-primary/20 hover:shadow-accent-primary/10"
                : "border-border-medium/40 dark:border-white/[0.08] hover:shadow-black/5"
        }`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Date + status badge */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-accent-primary" />
              <span className="text-xs font-semibold text-accent-primary tracking-wide">
                {dateStr}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Toggle done button */}
              <button
                type="button"
                onClick={() => onToggleDone(entry.taskId, isCompleted)}
                disabled={isToggling}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                  isCompleted
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10"
                    : isPending
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25 shadow-sm shadow-blue-500/10"
                      : isCreated
                        ? "bg-accent-primary/15 text-accent-primary border-accent-primary/30 hover:bg-accent-primary/25"
                        : "bg-bg-tertiary/50 text-fg-tertiary border-border-medium/30 hover:text-accent-primary hover:border-accent-primary/30 hover:bg-accent-primary/10"
                }`}
              >
                {isToggling ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                {statusLabel}
              </button>

              {/* Delete button */}
              {canDelete && (
                <>
                  {confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { onDelete(entry.taskId); setConfirmDelete(false); }}
                        disabled={isDeleting}
                        className="px-2 py-1 rounded-lg bg-red-500/15 text-red-400 text-[10px] font-bold border border-red-500/30 hover:bg-red-500/25 transition-colors"
                      >
                        {isDeleting ? <Loader2 size={10} className="animate-spin" /> : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-1 rounded-lg bg-bg-tertiary/50 text-fg-tertiary text-[10px] font-bold border border-border-medium/30 hover:text-fg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="p-1.5 rounded-lg text-fg-quaternary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-base font-bold text-fg-primary mb-1.5 leading-snug">
            {entry.taskTitle}
          </h4>
          <p className="text-sm text-fg-secondary leading-relaxed mb-3">
            Project: {entry.projectTitle}
          </p>

          {/* User avatar */}
          {entry.user && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0">
                {entry.user.image ? (
                  <Image
                    src={entry.user.image}
                    alt={entry.user.name ?? "User"}
                    width={24}
                    height={24}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                    <User size={12} className="text-white" />
                  </div>
                )}
              </div>
              <span className="text-xs text-fg-secondary">{entry.user.name ?? "Unknown"}</span>
            </div>
          )}

          {/* Hover metadata tooltip */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-out ${
              isHovered ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0 mt-0"
            }`}
          >
            <div className="pt-3 border-t border-border-medium/20 dark:border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2 text-[11px] text-fg-tertiary">
                <Eye size={11} className="flex-shrink-0" />
                <span>Action: <span className="text-fg-secondary font-medium">{entry.action.replace(/_/g, " ")}</span></span>
              </div>
              {entry.user && (
                <div className="flex items-center gap-2 text-[11px] text-fg-tertiary">
                  <Edit3 size={11} className="flex-shrink-0" />
                  <span>By: <span className="text-fg-secondary font-medium">{entry.user.name ?? entry.user.email ?? "Unknown"}</span></span>
                </div>
              )}
              {entry.oldValue && (
                <div className="flex items-center gap-2 text-[11px] text-fg-tertiary">
                  <Shield size={11} className="flex-shrink-0" />
                  <span>From: <span className="text-fg-secondary font-medium">{entry.oldValue}</span> → <span className="text-fg-secondary font-medium">{entry.newValue}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-fg-tertiary">
                <Clock size={11} className="flex-shrink-0" />
                <span>
                  {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {" at "}
                  {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-fg-tertiary">
                <Calendar size={11} className="flex-shrink-0" />
                <span>Project: <span className="text-accent-primary font-medium">{entry.projectTitle}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Generated Tasks Preview ─── */
function AiDraftPreview({
  tasks,
  reasoning,
  onApply,
  onDismiss,
  isApplying,
}: {
  tasks: GeneratedTask[];
  reasoning: string;
  onApply: (tasks: GeneratedTask[]) => void;
  onDismiss: () => void;
  isApplying: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl border border-accent-primary/30 bg-accent-primary/[0.04] dark:bg-accent-primary/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-primary" />
          <h4 className="text-sm font-bold text-fg-primary">AI Generated Tasks</h4>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-fg-tertiary hover:text-fg-secondary transition-colors"
        >
          Dismiss
        </button>
      </div>

      {reasoning && (
        <p className="text-xs text-fg-secondary italic leading-relaxed">{reasoning}</p>
      )}

      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-bg-elevated dark:bg-white/[0.03] border border-border-medium/20 dark:border-white/[0.06]"
          >
            <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-accent-primary">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg-primary">{t.title}</p>
              {t.description && (
                <p className="text-xs text-fg-secondary mt-0.5 line-clamp-2">{t.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  PRIORITY_OPTIONS.find((p) => p.value === t.priority)?.color ?? ""
                }`}>
                  {t.priority.toUpperCase()}
                </span>
                {t.estimatedDueDays && (
                  <span className="text-[10px] text-fg-quaternary">
                    ~{t.estimatedDueDays}d
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onApply(tasks)}
        disabled={isApplying}
        className="w-full py-2.5 rounded-xl bg-accent-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-accent-primary/20 disabled:opacity-50"
      >
        {isApplying ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Creating tasks...
          </>
        ) : (
          <>
            <CheckCircle2 size={14} />
            Create All {tasks.length} Tasks
          </>
        )}
      </button>
    </div>
  );
}

/* ─── Create New Entry Form ─── */
function CreateNewEntryForm({
  projects,
  onCreated,
  members,
}: {
  projects: ProjectCard[];
  onCreated: () => void;
  members: OrgMember[];
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projects[0]?.id ?? null,
  );
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);

  /* AI draft state */
  const [aiDrafts, setAiDrafts] = useState<GeneratedTask[] | null>(null);
  const [aiReasoning, setAiReasoning] = useState("");
  const [isApplyingDrafts, setIsApplyingDrafts] = useState(false);

  /* Close assign dropdown on click outside */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(e.target as Node)) {
        setShowAssignDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMember = members.find((m) => m.id === assignedToId);

  const createTask = typedApi.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDueDate("");
      setAssignedToId("");
      setError("");
      onCreated();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const generateDrafts = typedApi.agent.generateTaskDrafts.useMutation({
    onSuccess: (data) => {
      setAiDrafts(data.tasks);
      setAiReasoning(data.reasoning);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedProjectId) return;

    createTask.mutate({
      projectId: selectedProjectId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedToId: assignedToId || undefined,
    });
  };

  const handleGenerateAi = () => {
    if (!selectedProjectId) return;
    setError("");
    generateDrafts.mutate({
      projectId: selectedProjectId,
      message: description.trim() || undefined,
    });
  };

  const applyAiDrafts = useCallback(
    (tasks: GeneratedTask[]) => {
      if (!selectedProjectId) return;
      setIsApplyingDrafts(true);

      let idx = 0;
      const createNext = () => {
        if (idx >= tasks.length) {
          setIsApplyingDrafts(false);
          setAiDrafts(null);
          setAiReasoning("");
          onCreated();
          return;
        }
        const t = tasks[idx]!;
        idx++;
        createTask.mutate({
          projectId: selectedProjectId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          dueDate: t.estimatedDueDays
            ? new Date(Date.now() + t.estimatedDueDays * 86400000)
            : undefined,
        });
        setTimeout(createNext, 400);
      };
      createNext();
    },
    [selectedProjectId, createTask, onCreated],
  );

  return (
    <div className="create-entry-card rounded-2xl border border-border-medium/40 dark:border-white/[0.08] p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-accent-primary/15 border-2 border-accent-primary/40 flex items-center justify-center">
          <Plus size={16} className="text-accent-primary" />
        </div>
        <h3 className="text-lg font-bold text-fg-primary">Create New Entry</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Project select */}
        {projects.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-fg-tertiary uppercase tracking-wider mb-2">
              Project
            </label>
            <div className="relative">
              <select
                value={selectedProjectId ?? ""}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl timeline-input appearance-none text-sm text-fg-primary pr-10"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-bg-primary text-fg-primary">
                    {p.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary pointer-events-none"
              />
            </div>
          </div>
        )}

        {/* Task Title */}
        <div>
          <label className="block text-xs font-bold text-fg-tertiary uppercase tracking-wider mb-2">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Database Migration Review"
            className="w-full px-4 py-3 rounded-xl timeline-input text-sm text-fg-primary placeholder:text-fg-quaternary"
          />
        </div>

        {/* Description — kept rectangular with explicit border-radius */}
        <div>
          <label className="block text-xs font-bold text-fg-tertiary uppercase tracking-wider mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detail the specific requirements..."
            rows={3}
            className="w-full px-4 py-3 timeline-input text-sm text-fg-primary placeholder:text-fg-quaternary resize-y min-h-[80px]"
            style={{ borderRadius: "0.75rem" }}
          />
        </div>

        {/* Priority / Assign To / Date row */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
            {/* Priority selector — dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-fg-tertiary uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2.5 rounded-xl timeline-input appearance-none text-xs text-fg-primary pr-9 font-medium"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value} className="bg-bg-primary text-fg-primary">
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    priority === "low" ? "bg-emerald-400" :
                    priority === "medium" ? "bg-amber-400" :
                    priority === "high" ? "bg-orange-400" : "bg-red-400"
                  }`} />
                  <ChevronDown size={12} className="text-fg-tertiary" />
                </div>
              </div>
            </div>
            <div ref={assignDropdownRef} className="relative">
              <label className="block text-[10px] font-bold text-fg-tertiary uppercase tracking-wider mb-1.5">
                Assign To
              </label>
              <button
                type="button"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl timeline-input text-left"
              >
                {selectedMember ? (
                  <>
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0">
                      {selectedMember.image ? (
                        <Image src={selectedMember.image} alt={selectedMember.name ?? ""} width={20} height={20} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                          <User size={10} className="text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-fg-primary font-medium truncate flex-1">{selectedMember.name?.split(" ")[0] ?? "Member"}</span>
                  </>
                ) : (
                  <>
                    <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
                      <User size={10} className="text-accent-primary" />
                    </div>
                    <span className="text-xs text-fg-quaternary font-medium truncate flex-1">Select...</span>
                  </>
                )}
                <ChevronDown size={12} className={`text-fg-tertiary transition-transform ${showAssignDropdown ? "rotate-180" : ""}`} />
              </button>

              {/* Assign dropdown */}
              {showAssignDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-border-medium/40 dark:border-white/[0.1] bg-bg-elevated dark:bg-[rgb(14,14,18)] shadow-xl shadow-black/10 dark:shadow-black/30 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="max-h-36 overflow-y-auto py-1">
                    {/* Unassign option */}
                    <button
                      type="button"
                      onClick={() => { setAssignedToId(""); setShowAssignDropdown(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent-primary/10 transition-colors ${!assignedToId ? "bg-accent-primary/5" : ""}`}
                    >
                      <div className="w-5 h-5 rounded-full bg-bg-tertiary/50 flex items-center justify-center flex-shrink-0">
                        <User size={10} className="text-fg-quaternary" />
                      </div>
                      <span className="text-xs text-fg-secondary">Unassigned</span>
                    </button>

                    {members.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => { setAssignedToId(m.id); setShowAssignDropdown(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent-primary/10 transition-colors ${assignedToId === m.id ? "bg-accent-primary/5" : ""}`}
                      >
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0">
                          {m.image ? (
                            <Image src={m.image} alt={m.name ?? ""} width={20} height={20} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                              <User size={8} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-fg-primary font-medium truncate">{m.name ?? "Unknown"}</p>
                          <p className="text-[10px] text-fg-quaternary truncate">{m.role}</p>
                        </div>
                        {assignedToId === m.id && (
                          <CheckCircle2 size={12} className="text-accent-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Invite section */}
                  <div className="border-t border-border-medium/20 dark:border-white/[0.06] p-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-accent-primary font-medium hover:bg-accent-primary/10 transition-colors"
                      onClick={() => setShowAssignDropdown(false)}
                    >
                      <UserPlus size={13} />
                      <span>Invite people</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-fg-tertiary uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl timeline-input text-xs text-fg-primary"
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-xs font-bold text-fg-tertiary uppercase tracking-wider mb-2">
            Attachments
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="timeline-upload-zone flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border-medium/50 dark:border-white/[0.1] cursor-pointer hover:border-accent-primary/40 transition-colors"
          >
            <Upload size={20} className="text-accent-primary" />
            <p className="text-xs text-fg-secondary">
              <span className="text-accent-primary font-semibold">Click to upload</span> or drag
              and drop
            </p>
            <p className="text-[10px] text-fg-quaternary">PDF, DOCX, PNG, JPG (max. 10MB)</p>
          </div>
          <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.png,.jpg,.jpeg" />
        </div>

        {/* AI Task Planner — now below attachments, clickable */}
        <button
          type="button"
          onClick={handleGenerateAi}
          disabled={generateDrafts.isPending || !selectedProjectId}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-accent-primary/[0.08] dark:bg-accent-primary/[0.1] border border-accent-primary/20 hover:bg-accent-primary/[0.15] hover:border-accent-primary/40 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-primary/25 transition-colors">
            {generateDrafts.isPending ? (
              <Loader2 size={20} className="text-accent-primary animate-spin" />
            ) : (
              <Sparkles size={20} className="text-accent-primary" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-fg-primary">
              {generateDrafts.isPending ? "Generating..." : "AI Task Planner"}
            </p>
            <p className="text-xs text-fg-secondary">
              Generate tasks based off the project&apos;s description
            </p>
          </div>
        </button>

        {/* AI Draft Preview */}
        {aiDrafts && aiDrafts.length > 0 && (
          <AiDraftPreview
            tasks={aiDrafts}
            reasoning={aiReasoning}
            onApply={applyAiDrafts}
            onDismiss={() => { setAiDrafts(null); setAiReasoning(""); }}
            isApplying={isApplyingDrafts}
          />
        )}

        {/* Create Task Button */}
        <button
          type="submit"
          disabled={createTask.isPending || !title.trim() || !selectedProjectId}
          className="w-full py-3.5 rounded-xl bg-accent-primary text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-accent-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createTask.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} />
              Create Task
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* ─── Master Progress Header ─── */
function MasterProgressBar({
  percentage,
}: {
  percentage: number;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-fg-primary uppercase tracking-wider">
          Master Progress
        </h3>
        <span className="text-sm font-bold text-accent-primary">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="relative w-full h-2 bg-bg-tertiary dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(90deg, rgb(var(--accent-primary)), rgb(var(--accent-secondary)))",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main Export ─── */
export function TaskTimelineClient() {
  const { data: session } = useSession();
  const { permissions } = useRolePermissions();

  /* Get user profile to determine active org */
  const { data: profile } = typedApi.user.getProfile.useQuery(undefined, {
    staleTime: 60_000,
  });

  const activeOrgId = profile?.organization?.id ?? profile?.activeOrganizationId ?? null;

  /* Get org members for assign dropdown */
  const { data: orgMembers } = typedApi.organization.getMembers.useQuery(
    { organizationId: activeOrgId! },
    { staleTime: 60_000, enabled: !!activeOrgId },
  );

  const {
    data: projects,
    isLoading: isLoadingProjects,
    error: projError,
  } = typedApi.project.getMyProjects.useQuery(undefined, {
    staleTime: 30_000,
    enabled: true,
  });

  const {
    data: activity,
    isLoading: isLoadingActivity,
    error: actError,
  } = typedApi.task.getOrgActivity.useQuery(
    { limit: 50, scope: "organization" },
    { staleTime: 15_000 },
  );

  const utils = api.useUtils();

  const handleCreated = () => {
    void utils.invalidate();
  };

  /* Status toggle mutation */
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const updateStatus = typedApi.task.updateStatus.useMutation({
    onSuccess: () => {
      setTogglingId(null);
      void utils.invalidate();
    },
    onError: () => {
      setTogglingId(null);
    },
  });

  const handleToggleDone = (taskId: number, currentlyDone: boolean) => {
    setTogglingId(taskId);
    updateStatus.mutate({
      taskId,
      status: currentlyDone ? "pending" : "completed",
    });
  };

  /* Delete mutation */
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleteTask = typedApi.task.delete.useMutation({
    onSuccess: () => {
      setDeletingId(null);
      void utils.invalidate();
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = (taskId: number) => {
    setDeletingId(taskId);
    deleteTask.mutate({ taskId });
  };

  /* Computed stats */
  const { percentage, timelineEntries } = useMemo(() => {
    const allProjects = projects ?? [];
    const allTasks = allProjects.flatMap((p) => p.tasks ?? []);
    const total = allTasks.length;
    const completed = allTasks.filter((t) => t.status === "completed").length;
    const pct = total > 0 ? (completed / total) * 100 : 0;

    const entries = (activity?.rows ?? [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return { percentage: pct, timelineEntries: entries };
  }, [projects, activity]);

  const isLoading = isLoadingProjects || isLoadingActivity;
  const errorMsg = projError?.message ?? actError?.message;

  /* Permission: can delete if admin role or if the activity user matches the session user */
  const canDeleteTask = (entry: OrgActivityEntry) => {
    if (permissions.canDeleteTasks) return true;
    if (entry.user?.id && session?.user?.id && entry.user.id === session.user.id) return true;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 text-accent-primary mx-auto mb-3" />
          <p className="text-sm text-fg-secondary">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} />
          {errorMsg}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-fg-primary tracking-tight">
          Task Creation & Timeline
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Add new tasks and track your historical progress.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6 xl:gap-8">
        {/* Left: Create Entry */}
        <div>
          <CreateNewEntryForm
            projects={projects ?? []}
            onCreated={handleCreated}
            members={orgMembers ?? []}
          />
        </div>

        {/* Right: Timeline */}
        <div>
          <MasterProgressBar percentage={percentage} />

          {timelineEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mb-4">
                <Calendar size={28} className="text-accent-primary" />
              </div>
              <h3 className="text-lg font-bold text-fg-primary mb-2">No activity yet</h3>
              <p className="text-sm text-fg-secondary max-w-sm">
                Create tasks and track your progress here. Activity will appear on the timeline.
              </p>
            </div>
          ) : (
            <div className="timeline-list relative">
              {/* Bottom blur overlay for scroll depth effect */}
              <div className="timeline-scroll-fade pointer-events-none" />
              {timelineEntries.map((entry, i) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLast={i === timelineEntries.length - 1}
                  index={i}
                  onToggleDone={handleToggleDone}
                  onDelete={handleDelete}
                  isToggling={togglingId === entry.taskId}
                  isDeleting={deletingId === entry.taskId}
                  canDelete={canDeleteTask(entry)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom user badge */}
      {session?.user && (
        <div className="mt-10 flex items-center gap-3 px-1">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0 ring-2 ring-accent-primary/20">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? "User"}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                <User size={14} className="text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-fg-primary">{session.user.name}</p>
            <p className="text-xs text-fg-tertiary">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : "Member"}{profile?.organization ? ` · ${profile.organization.name}` : ""}</p>
          </div>
        </div>
      )}
    </div>
  );
}
