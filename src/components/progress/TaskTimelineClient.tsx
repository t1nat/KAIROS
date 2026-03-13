"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Check,
  Loader2,
  ChevronDown,
  Trash2,
  AlertTriangle,
  Filter,
  X,
  Clock,
  CheckSquare,
  AlertCircle,
  Zap,
} from "lucide-react";
import { MilestoneTimeline } from "./MilestoneTimeline";

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
  assignee: {
    id: string | null;
    name: string | null;
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
  onToggleDone,
  onDelete,
  isToggling,
  isDeleting,
  canDelete,
  taskCurrentStatus,
}: {
  entry: OrgActivityEntry;
  isLast: boolean;
  onToggleDone: (taskId: number, currentlyDone: boolean) => void;
  onDelete: (taskId: number) => void;
  isToggling: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  taskCurrentStatus: TaskStatus | undefined;
}) {
  const entryRef = useRef<HTMLDivElement>(null);

  const date = new Date(entry.createdAt);
  const dateStr = date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
  // Use the REAL current task status from DB, not the historical activity entry value
  const isCompleted = taskCurrentStatus === "completed";

  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      ref={entryRef}
      className="relative flex gap-3 sm:gap-4"
    >
      {/* Vertical line + circle with tick */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => onToggleDone(entry.taskId, isCompleted)}
          disabled={isToggling}
          className={`w-7 h-7 rounded-full flex-shrink-0 z-10 transition-all duration-200 cursor-pointer flex items-center justify-center border-2 ${
            isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "bg-white dark:bg-[#1a1625] border-slate-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-400"
          }`}
          title={isCompleted ? "Mark as pending" : "Mark as done"}
        >
          {isToggling ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Check size={13} className={isCompleted ? "text-white" : "text-slate-400 dark:text-slate-500"} />
          )}
        </button>
        {!isLast && (
          <div className="w-px flex-1 min-h-[40px] bg-slate-200 dark:bg-white/[0.08]" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-4 -mt-0.5">
        <div className={`rounded-lg border p-3.5 sm:p-4 transition-all duration-200 ${
          isCompleted
            ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.04]"
            : "border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#1a1625] hover:border-slate-300 dark:hover:border-white/[0.1]"
        }`}>
          {/* Top row: date + actions */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-fg-tertiary tracking-wide">{dateStr}</span>
            <div className="flex items-center gap-1">
              {canDelete && (
                <>
                  {confirmDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { onDelete(entry.taskId); setConfirmDelete(false); }}
                        disabled={isDeleting}
                        className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold hover:bg-red-500/25 transition-colors"
                      >
                        {isDeleting ? <Loader2 size={10} className="animate-spin" /> : "Delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="px-2 py-0.5 rounded bg-bg-tertiary/50 text-fg-tertiary text-[10px] font-bold hover:text-fg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="p-1 rounded text-fg-quaternary hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete task"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className={`text-sm font-semibold mb-1 leading-snug ${
            isCompleted ? "text-fg-tertiary line-through" : "text-fg-primary"
          }`}>
            {entry.taskTitle}
          </h4>
          <div className="flex items-center justify-between">
            <p className="text-xs text-fg-tertiary">
              {entry.projectTitle}
              {entry.user ? ` · ${entry.user.name ?? "Unknown"}` : ""}
            </p>
            {entry.assignee && (
              <div className="flex items-center gap-1.5 ml-2 flex-shrink-0" title={entry.assignee.name ?? "Assigned"}>
                <div className="w-5 h-5 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0">
                  {entry.assignee.image ? (
                    <Image src={entry.assignee.image} alt={entry.assignee.name ?? ""} width={20} height={20} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                      <User size={10} className="text-white" />
                    </div>
                  )}
                </div>
              </div>
            )}
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
  const [selected, setSelected] = useState<Set<number>>(() => new Set(tasks.map((_, i) => i)));

  const toggleTask = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map((_, i) => i)));
  };

  const selectedTasks = tasks.filter((_, i) => selected.has(i));

  return (
    <div className="mt-4 rounded-xl border border-accent-primary/30 bg-accent-primary/[0.04] dark:bg-accent-primary/[0.06] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-primary" />
          <h4 className="text-sm font-bold text-fg-primary">AI Generated Tasks</h4>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] text-accent-primary hover:text-accent-primary/80 font-medium transition-colors"
          >
            {selected.size === tasks.length ? "Deselect All" : "Select All"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-fg-tertiary hover:text-fg-secondary transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {reasoning && (
        <p className="text-xs text-fg-secondary italic leading-relaxed">{reasoning}</p>
      )}

      <div className="space-y-2">
        {tasks.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleTask(i)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              selected.has(i)
                ? "bg-accent-primary/[0.06] dark:bg-accent-primary/[0.08] border-accent-primary/30"
                : "bg-bg-elevated dark:bg-white/[0.03] border-border-medium/20 dark:border-white/[0.06] opacity-60"
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
              selected.has(i)
                ? "bg-accent-primary border-accent-primary"
                : "border-slate-300 dark:border-slate-600"
            }`}>
              {selected.has(i) && <Check size={11} className="text-white" />}
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
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onApply(selectedTasks)}
        disabled={isApplying || selectedTasks.length === 0}
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
            Create {selectedTasks.length} of {tasks.length} Tasks
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
  selectedProjectId,
  onProjectChange,
}: {
  projects: ProjectCard[];
  onCreated: () => void;
  members: OrgMember[];
  selectedProjectId: number | null;
  onProjectChange: (id: number | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: number; type: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Restore unsaved task changes from localStorage
  const taskDraftKey = 'kairos_task_draft';
  const isTaskRestoredRef = useRef(false);
  useEffect(() => {
    if (isTaskRestoredRef.current) return;
    isTaskRestoredRef.current = true;
    try {
      const saved = localStorage.getItem(taskDraftKey);
      if (saved) {
        const d = JSON.parse(saved) as Record<string, string>;
        if (Date.now() - (Number(d._ts) || 0) < 120000) { // 2 minutes
          if (d.title) setTitle(d.title);
          if (d.description) setDescription(d.description);
          if (d.dueDate) setDueDate(d.dueDate);
        } else {
          localStorage.removeItem(taskDraftKey);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const hasContent = title || description;
    if (hasContent) {
      localStorage.setItem(taskDraftKey, JSON.stringify({ title, description, dueDate, _ts: Date.now() }));
    } else {
      localStorage.removeItem(taskDraftKey);
    }
  }, [title, description, dueDate]);

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
      // Keep PDF attachments visible after task creation; only clear non-PDFs
      setAttachedFiles((prev) => prev.filter((f) => f.type === "application/pdf"));
      localStorage.removeItem(taskDraftKey);
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
        setTimeout(createNext, 80);
      };
      createNext();
    },
    [selectedProjectId, createTask, onCreated],
  );

  return (
    <div className="create-entry-card bg-white dark:bg-[#20152b] rounded-xl border border-slate-200 dark:border-accent-primary/20 shadow-sm p-6 flex flex-col gap-6 relative overflow-hidden">
      {/* Glow orb */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent-primary/10 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/4" />
      <h3 className="text-slate-900 dark:text-slate-100 text-xl font-bold border-b border-slate-100 dark:border-accent-primary/10 pb-4 flex items-center gap-2 relative z-10">
        <Plus size={20} className="text-accent-primary" />
        Create New Entry
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        {/* Project select */}
        {projects.length > 0 && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              Project
            </label>
            <div className="relative">
              <select
                value={selectedProjectId ?? ""}
                onChange={(e) => onProjectChange(Number(e.target.value))}
                className="w-full rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-accent-primary/30 text-slate-900 dark:text-slate-100 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary h-12 px-4 appearance-none pr-10 transition-all hover:border-accent-primary/50"
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
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Database Migration Review"
            className="w-full rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-accent-primary/30 text-slate-900 dark:text-slate-100 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary h-12 px-4 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all hover:border-accent-primary/50"
          />
        </div>

        {/* Priority / Assign To / Date row */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
            {/* Priority selector — dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-accent-primary/30 text-slate-900 dark:text-slate-100 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary h-12 px-4 appearance-none transition-all hover:border-accent-primary/50"
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                Assign To
              </label>
              <button
                type="button"
                onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                className="w-full flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-accent-primary/30 h-12 px-4 text-left transition-all hover:border-accent-primary/50"
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
                Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-accent-primary/30 text-slate-900 dark:text-slate-100 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary h-12 px-4 transition-all hover:border-accent-primary/50"
              />
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
            Attachments
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const files = Array.from(e.dataTransfer.files);
              const valid = files.filter((f) => f.size <= 10 * 1024 * 1024);
              if (valid.length < files.length) setError("Some files exceed 10MB limit");
              setAttachedFiles((prev) => [...prev, ...valid.map((f) => ({ name: f.name, size: f.size, type: f.type }))]);
            }}
            className={`w-full rounded-lg border-2 border-dashed ${isDragging ? "border-accent-primary bg-accent-primary/10" : "border-slate-300 dark:border-accent-primary/40 bg-slate-50/50 dark:bg-black/10"} hover:bg-slate-50 dark:hover:bg-accent-primary/5 transition-colors flex flex-col items-center justify-center py-6 cursor-pointer hover:border-accent-primary/60`}
          >
            <Upload size={20} className="text-accent-primary" />
            <p className="text-xs text-fg-secondary">
              <span className="text-accent-primary font-semibold">Click to upload</span> or drag
              and drop
            </p>
            <p className="text-[10px] text-fg-quaternary">PDF, DOCX, PNG, JPG (max. 10MB)</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              const valid = files.filter((f) => f.size <= 10 * 1024 * 1024);
              if (valid.length < files.length) setError("Some files exceed 10MB limit");
              setAttachedFiles((prev) => [...prev, ...valid.map((f) => ({ name: f.name, size: f.size, type: f.type }))]);
              e.target.value = "";
            }}
          />
          {attachedFiles.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-accent-primary/20 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-accent-primary font-semibold uppercase text-[10px]">{f.name.split(".").pop()}</span>
                    <span className="text-fg-primary truncate">{f.name}</span>
                    <span className="text-fg-quaternary shrink-0">({(f.size / 1024).toFixed(0)} KB)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="p-1 rounded text-fg-tertiary hover:text-red-400 transition shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Task Planner — now below attachments, clickable */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
              Project Description / AI Instructions
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the project or paste instructions for the AI task planner..."
              rows={3}
              className="w-full rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-300 dark:border-accent-primary/30 text-slate-900 dark:text-slate-100 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary min-h-[80px] p-4 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all resize-y hover:border-accent-primary/50"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={generateDrafts.isPending || !selectedProjectId}
            className="w-full text-left bg-accent-primary/5 border border-accent-primary/50 hover:border-accent-primary rounded-lg p-4 flex items-start gap-4 transition-all hover:shadow-[0_0_15px_rgb(var(--accent-primary)/0.3)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="bg-accent-primary/20 p-2 rounded-full flex shrink-0 shadow-[0_0_10px_rgb(var(--accent-primary)/0.2)] group-hover:bg-accent-primary/30 transition-colors">
              {generateDrafts.isPending ? (
                <Loader2 size={24} className="text-accent-primary animate-spin" />
              ) : (
                <Sparkles size={24} className="text-accent-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <h4 className="text-slate-900 dark:text-slate-100 font-semibold mb-1">
                {generateDrafts.isPending ? "Generating..." : "AI Task Planner"}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Generate tasks from the description above or the project&apos;s context.
              </p>
            </div>
          </button>
        </div>

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
          className="w-full bg-gradient-to-r from-accent-primary to-purple-600 hover:from-accent-primary/90 hover:to-purple-500 text-white px-8 py-3 rounded-lg font-semibold shadow-[0_0_15px_rgb(var(--accent-primary)/0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Master Progress
        </span>
        <span className="text-accent-primary font-bold">
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgb(var(--accent-primary)/0.5)]"
          style={{
            width: `${percentage}%`,
            background: "linear-gradient(90deg, rgb(var(--accent-primary)), rgb(168 85 247))",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Status Filter ─── */
type StatusFilter = "all" | "completed" | "pending" | "in_progress" | "blocked";
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "completed", label: "Done" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
];

/* ─── Task Status Visualization Card ─── */
function TaskStatusCard({
  title,
  count,
  icon: Icon,
  color,
}: {
  title: string;
  count: number;
  icon: any;
  color: string;
}) {
  return (
    <div className={`rounded-lg border-2 p-4 ${color} flex flex-col gap-3 flex-1 min-w-[200px]`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color.replace("bg-", "bg-").replace("border-", "border-").split(" ")[0]}/20`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{title}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Export ─── */
export function TaskTimelineClient() {
  const { data: session } = useSession();
  const { permissions } = useRolePermissions();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"creation" | "timeline">("creation");

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
    { limit: 50, scope: "all" },
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
      // Refetch the project data to get updated stats
      void utils.project.getMyProjects.invalidate();
      void utils.task.getOrgActivity.invalidate();
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
      void utils.project.getMyProjects.invalidate();
      void utils.task.getOrgActivity.invalidate();
    },
    onError: () => {
      setDeletingId(null);
    },
  });

  const handleDelete = (taskId: number) => {
    setDeletingId(taskId);
    deleteTask.mutate({ taskId });
  };

  /* Computed stats — percentage uses tasks of the selected project */
  const { percentage, timelineEntries, taskStatusMap, allTasksByStatus } = useMemo(() => {
    const allProjects = projects ?? [];
    const effectivePid = selectedProjectId ?? allProjects[0]?.id ?? null;
    const scopedProjects = effectivePid
      ? allProjects.filter((p) => p.id === effectivePid)
      : allProjects;
    const scopedTasks = scopedProjects.flatMap((p) => p.tasks ?? []);
    const total = scopedTasks.length;
    const completed = scopedTasks.filter((t) => t.status === "completed").length;
    const pct = total > 0 ? (completed / total) * 100 : 0;

    // Build a map of taskId -> current status from ALL project data (needed for toggle)
    const allTasks = allProjects.flatMap((p) => p.tasks ?? []);
    const statusMap = new Map<number, TaskStatus>();
    for (const t of allTasks) {
      statusMap.set(t.id, t.status);
    }

    // Group tasks by status for visualization
    const tasksByStatus: Record<TaskStatus, typeof allTasks> = {
      pending: [],
      in_progress: [],
      completed: [],
      blocked: [],
    };
    for (const t of scopedTasks) {
      tasksByStatus[t.status].push(t);
    }

    const sorted = (activity?.rows ?? [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Deduplicate by taskId — keep only the most recent activity entry per task
    const seen = new Set<number>();
    const entries = sorted.filter((e) => {
      if (seen.has(e.taskId)) return false;
      seen.add(e.taskId);
      return true;
    }).slice(0, 50);

    return { percentage: pct, timelineEntries: entries, taskStatusMap: statusMap, allTasksByStatus: tasksByStatus };
  }, [projects, activity, selectedProjectId]);

  /* Resolve the effective project filter — default to first project if user hasn't chosen */
  const effectiveProjectId = selectedProjectId ?? projects?.[0]?.id ?? null;

  /* Filter timeline entries by project + status */
  const filteredEntries = useMemo(() => {
    let entries = timelineEntries;
    // Filter by selected project
    if (effectiveProjectId) {
      entries = entries.filter((entry) => entry.projectId === effectiveProjectId);
    }
    if (statusFilter === "all") return entries;
    return entries.filter((entry) => {
      if (statusFilter === "completed") return entry.action === "status_changed" && entry.newValue === "completed";
      if (statusFilter === "pending") return entry.action === "created" || (entry.action === "status_changed" && entry.newValue === "pending");
      if (statusFilter === "in_progress") return entry.action === "status_changed" && entry.newValue === "in_progress";
      if (statusFilter === "blocked") return entry.action === "status_changed" && entry.newValue === "blocked";
      return true;
    });
  }, [timelineEntries, statusFilter, effectiveProjectId]);

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

  /* No projects — prompt user to create one first */
  if (!projects || projects.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-6">
            <Calendar size={36} className="text-accent-primary" />
          </div>
          <h2 className="text-2xl font-bold text-fg-primary mb-2">You have no active projects.</h2>
          <p className="text-fg-secondary mb-6">Task creation and timeline become active after you create a project.</p>
          <a
            href="/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-accent-primary to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-primary/25 transition-all hover:scale-[1.02]"
          >
            <Plus size={18} />
            Create one now
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Header with Page Title and Toggle Buttons */}
      <div className="px-4 sm:px-6 md:px-8 py-6 border-b border-border-medium/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight tracking-tight">
              Task Creation & Timeline
            </h1>
            <p className="text-base font-medium text-slate-600 dark:text-slate-400 mt-1">
              Add new tasks and track your historical progress.
            </p>
          </div>

          {/* Toggle Buttons - Enhanced Segmented Control */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 bg-white dark:bg-slate-900/50 rounded-full p-1.5 border border-slate-200 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow"
          >
            <button
              onClick={() => setActiveView("creation")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeView === "creation"
                  ? "bg-gradient-to-r from-accent-primary to-purple-600 text-white shadow-lg shadow-accent-primary/30"
                  : "text-fg-secondary hover:text-fg-primary"
              }`}
            >
              Task Creation
            </button>
            <button
              onClick={() => setActiveView("timeline")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeView === "timeline"
                  ? "bg-gradient-to-r from-accent-primary to-purple-600 text-white shadow-lg shadow-accent-primary/30"
                  : "text-fg-secondary hover:text-fg-primary"
              }`}
            >
              Timeline
            </button>
          </motion.div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeView === "creation" ? (
            <motion.div
              key="creation"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="flex flex-col w-full">
                {/* Full-width Form — fills the entire page */}
                <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <CreateNewEntryForm
                      projects={projects ?? []}
                      onCreated={handleCreated}
                      members={orgMembers ?? []}
                      selectedProjectId={selectedProjectId ?? projects?.[0]?.id ?? null}
                      onProjectChange={setSelectedProjectId}
                    />
                  </motion.div>
                </div>

                {/* Task Visualization Below Form */}
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-12 border-t border-border-medium/30">
                  <div className="pt-8">
                    <h2 className="text-xl font-bold text-fg-primary mb-4 flex items-center gap-2">
                      <span className="w-1 h-6 bg-gradient-to-b from-accent-primary to-purple-600 rounded-full" />
                      Existing Tasks by Status
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <TaskStatusCard
                        title="Pending"
                        count={allTasksByStatus.pending.length}
                        icon={Clock}
                        color="bg-slate-50 dark:bg-slate-500/10 border-slate-200 dark:border-slate-500/30 text-slate-600 dark:text-slate-300"
                      />
                      <TaskStatusCard
                        title="In Progress"
                        count={allTasksByStatus.in_progress.length}
                        icon={Zap}
                        color="bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-300"
                      />
                      <TaskStatusCard
                        title="Completed"
                        count={allTasksByStatus.completed.length}
                        icon={CheckSquare}
                        color="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300"
                      />
                      <TaskStatusCard
                        title="Blocked"
                        count={allTasksByStatus.blocked.length}
                        icon={AlertCircle}
                        color="bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8">
                {/* Timeline header with title and filters */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="mb-8"
                >
                  <h2 className="text-xl font-bold text-fg-primary mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-accent-primary to-purple-600 rounded-full" />
                    Project Timeline
                  </h2>

                  {/* Status filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {[
                      { value: "all", label: "All Events" },
                      { value: "completed", label: "Completed" },
                      { value: "in_progress", label: "In Progress" },
                      { value: "pending", label: "Pending" },
                      { value: "blocked", label: "Blocked" },
                    ].map((filter) => (
                      <motion.button
                        key={filter.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setStatusFilter(filter.value as "all" | "completed" | "in_progress" | "pending" | "blocked")}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                          statusFilter === filter.value
                            ? "bg-gradient-to-r from-accent-primary to-purple-600 text-white shadow-lg shadow-accent-primary/30"
                            : "bg-white dark:bg-slate-900/50 text-fg-secondary border border-slate-200 dark:border-white/[0.08] hover:text-fg-primary hover:border-slate-300 dark:hover:border-white/[0.1]"
                        }`}
                      >
                        {filter.label}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Horizontal timeline — scrolls internally */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="w-full overflow-visible"
                >
                  <MilestoneTimeline
                    entries={filteredEntries}
                    taskStatusMap={taskStatusMap}
                    canDeleteTask={canDeleteTask}
                    onToggleDone={handleToggleDone}
                    onDelete={handleDelete}
                    togglingId={togglingId}
                    deletingId={deletingId}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
