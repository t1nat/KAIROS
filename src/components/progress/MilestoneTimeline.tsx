"use client";

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Calendar,
  User,
  Trash2,
  Loader2,
  Check,
  Clock,
  Zap,
  CheckSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

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

interface MilestoneTimelineProps {
  entries: OrgActivityEntry[];
  taskStatusMap: Map<number, TaskStatus>;
  canDeleteTask: (entry: OrgActivityEntry) => boolean;
  onToggleDone: (taskId: number, currentlyDone: boolean) => void;
  onDelete: (taskId: number) => void;
  togglingId: number | null;
  deletingId: number | null;
}

function getStatusIcon(status: TaskStatus) {
  switch (status) {
    case "pending":
      return Clock;
    case "in_progress":
      return Zap;
    case "completed":
      return CheckSquare;
    case "blocked":
      return AlertCircle;
  }
}

function getStatusDotColor(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "bg-slate-400 dark:bg-slate-500";
    case "in_progress":
      return "bg-blue-500";
    case "completed":
      return "bg-emerald-500";
    case "blocked":
      return "bg-red-500";
  }
}

function getStatusRingColor(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "ring-slate-400/30";
    case "in_progress":
      return "ring-blue-500/30";
    case "completed":
      return "ring-emerald-500/30";
    case "blocked":
      return "ring-red-500/30";
  }
}

function getStatusBadgeColor(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "bg-slate-500/15 text-slate-400 border-slate-500/20";
    case "in_progress":
      return "bg-blue-500/15 text-blue-400 border-blue-500/20";
    case "completed":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    case "blocked":
      return "bg-red-500/15 text-red-400 border-red-500/20";
  }
}

function getStatusLabel(status: TaskStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "blocked":
      return "Blocked";
  }
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
  });
}

function formatFullDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Main Milestone Timeline (Horizontal) ─── */
export function MilestoneTimeline({
  entries,
  taskStatusMap,
  canDeleteTask,
  onToggleDone,
  onDelete,
  togglingId,
  deletingId,
}: MilestoneTimelineProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [entries]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-primary/10 flex items-center justify-center mb-4">
          <Calendar size={28} className="text-accent-primary" />
        </div>
        <h3 className="text-lg font-bold text-fg-primary mb-2">No milestones yet</h3>
        <p className="text-sm text-fg-secondary max-w-sm">
          Create tasks to start building your milestone timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Scroll buttons */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.1] shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <ChevronLeft size={16} className="text-fg-secondary" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.1] shadow-md flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
      >
        <ChevronRight size={16} className="text-fg-secondary" />
      </button>

      {/* Scrollable horizontal timeline */}
      <div
        ref={scrollRef}
        className="overflow-x-auto overflow-y-visible scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent mx-10 pb-4"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="relative pt-64 pb-16" style={{ minWidth: `${Math.max(sortedEntries.length * 160, 600)}px` }}>
          {/* The horizontal line */}
          <div className="absolute left-0 right-0 top-[256px] h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-white/[0.12] to-transparent" />
          {/* Slightly thicker center line for visual weight */}
          <div className="absolute left-4 right-4 top-[255px] h-[3px] rounded-full bg-gradient-to-r from-accent-primary/20 via-accent-primary/40 to-accent-primary/20" />

          {/* Dots and associated content */}
          <div className="flex items-start relative" style={{ paddingTop: 0 }}>
            {sortedEntries.map((entry, idx) => {
              const status = taskStatusMap.get(entry.taskId) ?? "pending";
              const isExpanded = expandedId === entry.taskId;
              const IconComponent = getStatusIcon(status);
              const date = new Date(entry.createdAt);

              return (
                <div
                  key={entry.id}
                  className="flex flex-col items-center relative group"
                  style={{ width: 160, flexShrink: 0 }}
                >
                  {/* ─── Hover card (positioned ABOVE the dot) ─── */}
                  <div className="absolute bottom-[calc(100%-220px)] left-1/2 -translate-x-1/2 w-56 hidden group-hover:block z-40 pointer-events-none">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-[#1e1530] rounded-xl border border-slate-200 dark:border-accent-primary/20 shadow-xl p-4 space-y-2.5"
                    >
                      {/* Title */}
                      <h4 className={`text-sm font-bold leading-snug ${
                        status === "completed" ? "text-fg-tertiary line-through" : "text-fg-primary"
                      }`}>
                        {entry.taskTitle}
                      </h4>

                      {/* Status badge */}
                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadgeColor(status)}`}>
                        <IconComponent size={10} />
                        {getStatusLabel(status)}
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5 text-[11px] text-fg-secondary border-t border-slate-100 dark:border-white/[0.06] pt-2">
                        <p className="font-medium text-fg-tertiary">{entry.projectTitle}</p>
                        <div className="flex items-center gap-1.5">
                          <Calendar size={10} className="opacity-50" />
                          <span>{formatFullDate(date)} at {formatTime(date)}</span>
                        </div>
                        {entry.user && (
                          <div className="flex items-center gap-1.5">
                            <User size={10} className="opacity-50" />
                            <span>By {entry.user.name ?? "Unknown"}</span>
                          </div>
                        )}
                        {entry.assignee && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0">
                              {entry.assignee.image ? (
                                <Image
                                  src={entry.assignee.image}
                                  alt={entry.assignee.name ?? ""}
                                  width={16}
                                  height={16}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                                  <User size={8} className="text-white" />
                                </div>
                              )}
                            </div>
                            <span>Assigned: {entry.assignee.name}</span>
                          </div>
                        )}
                        {entry.action && (
                          <div className="flex items-center gap-1.5 text-[10px] text-fg-tertiary italic">
                            Last action: {entry.action.replace(/_/g, " ")}
                            {entry.newValue ? ` → ${entry.newValue.replace(/_/g, " ")}` : ""}
                          </div>
                        )}
                      </div>

                      {/* Arrow pointing down to dot */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#1e1530] border-r border-b border-slate-200 dark:border-accent-primary/20 rotate-45" />
                    </motion.div>
                  </div>

                  {/* ─── The DOT ─── */}
                  <div
                    className="absolute top-[240px] left-1/2 -translate-x-1/2 cursor-pointer z-20"
                    onClick={() => setExpandedId(isExpanded ? null : entry.taskId)}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.04 }}
                      whileHover={{ scale: 1.6 }}
                      whileTap={{ scale: 0.9 }}
                      className={`w-3 h-3 rounded-full ${getStatusDotColor(status)} ring-4 ${getStatusRingColor(status)} transition-all ${
                        isExpanded ? "ring-8 scale-150" : ""
                      }`}
                    />
                  </div>

                  {/* ─── Date label below the line ─── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 + 0.2 }}
                    className="absolute top-[270px] left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
                  >
                    <p className="text-[10px] font-semibold text-fg-tertiary">{formatDate(date)}</p>
                    <p className="text-[9px] text-fg-quaternary truncate max-w-[120px]">{entry.taskTitle}</p>
                  </motion.div>

                  {/* ─── Expanded detail panel (click to expand) ─── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-[300px] left-1/2 -translate-x-1/2 w-72 z-50"
                      >
                        <ExpandedMilestoneCard
                          entry={entry}
                          status={status}
                          isToggling={togglingId === entry.taskId}
                          isDeleting={deletingId === entry.taskId}
                          canDelete={canDeleteTask(entry)}
                          onToggleDone={onToggleDone}
                          onDelete={onDelete}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* End marker */}
            <div className="flex flex-col items-center relative" style={{ width: 80, flexShrink: 0 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: sortedEntries.length * 0.04 }}
                className="absolute top-[240px] left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent-primary/30 ring-4 ring-accent-primary/10"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: sortedEntries.length * 0.04 + 0.2 }}
                className="absolute top-[270px] left-1/2 -translate-x-1/2 text-[10px] font-semibold text-fg-quaternary whitespace-nowrap"
              >
                End
              </motion.p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Expanded card (shown on dot click) ─── */
function ExpandedMilestoneCard({
  entry,
  status,
  isToggling,
  isDeleting,
  canDelete,
  onToggleDone,
  onDelete,
}: {
  entry: OrgActivityEntry;
  status: TaskStatus;
  isToggling: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  onToggleDone: (taskId: number, currentlyDone: boolean) => void;
  onDelete: (taskId: number) => void;
}) {
  const isCompleted = status === "completed";
  const date = new Date(entry.createdAt);
  const IconComponent = getStatusIcon(status);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white dark:bg-[#1e1530] rounded-xl border border-slate-200 dark:border-accent-primary/20 shadow-2xl p-5 space-y-3">
      {/* Arrow pointing up */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white dark:bg-[#1e1530] border-l border-t border-slate-200 dark:border-accent-primary/20 rotate-45" />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className={`text-sm font-bold leading-snug flex-1 ${
          isCompleted ? "text-fg-tertiary line-through" : "text-fg-primary"
        }`}>
          {entry.taskTitle}
        </h4>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase flex-shrink-0 ${getStatusBadgeColor(status)}`}>
          <IconComponent size={10} />
          {getStatusLabel(status)}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5 text-xs text-fg-secondary border-t border-slate-100 dark:border-white/[0.06] pt-2">
        <p className="font-medium">{entry.projectTitle}</p>
        <div className="flex items-center gap-1.5">
          <Calendar size={11} className="opacity-50" />
          <span>{formatFullDate(date)} at {formatTime(date)}</span>
        </div>
        {entry.user && (
          <div className="flex items-center gap-1.5">
            <User size={11} className="opacity-50" />
            <span>Created by {entry.user.name ?? "Unknown"}</span>
          </div>
        )}
        {entry.assignee && (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-accent-primary/20 flex-shrink-0">
              {entry.assignee.image ? (
                <Image src={entry.assignee.image} alt={entry.assignee.name ?? ""} width={20} height={20} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                  <User size={10} className="text-white" />
                </div>
              )}
            </div>
            <span>Assigned to {entry.assignee.name}</span>
          </div>
        )}
        {entry.action && (
          <p className="text-[10px] text-fg-tertiary italic">
            Last: {entry.action.replace(/_/g, " ")}{entry.newValue ? ` → ${entry.newValue.replace(/_/g, " ")}` : ""}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-slate-100 dark:border-white/[0.06] pt-3">
        <button
          type="button"
          onClick={() => onToggleDone(entry.taskId, isCompleted)}
          disabled={isToggling}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            isCompleted
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
              : "bg-accent-primary/15 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/25"
          }`}
        >
          {isToggling ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <Check size={12} />
              {isCompleted ? "Mark Pending" : "Mark Done"}
            </>
          )}
        </button>

        {canDelete && (
          <>
            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => { onDelete(entry.taskId); setConfirmDelete(false); }}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 transition-all"
                >
                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> Yes</>}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.08] text-fg-secondary hover:bg-slate-200 dark:hover:bg-white/[0.12] transition-all"
                >
                  No
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/[0.08] text-fg-secondary hover:bg-red-500/15 hover:text-red-400 transition-all"
                title="Delete task"
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
