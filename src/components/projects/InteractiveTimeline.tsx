"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, ChevronDown, Clock, User, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

interface Task {
  id: number;
  title: string;
  description?: string | null;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date | null;
  assignedTo?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  completedAt?: Date | null;
  orderIndex: number;
  createdBy?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  completedBy?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  lastEditedBy?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  lastEditedAt?: Date | null;
}

interface InteractiveTimelineProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: number, newStatus: Task["status"]) => void;
  isReadOnly?: boolean;
  projectTitle?: string;
}

export function InteractiveTimeline({ 
  tasks, 
  onTaskStatusChange,
  isReadOnly = false,
  projectTitle 
}: InteractiveTimelineProps) {
  const t = useTranslations("create");
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const rafRef = useRef<number | null>(null);
  const animatedPercentageRef = useRef(0);
    
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    const targetPercentage = optimisticTasks.length === 0 
      ? 0 
      : (optimisticTasks.filter(t => t.status === "completed").length / optimisticTasks.length) * 100;

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const startPercentage = animatedPercentageRef.current;
    const duration = 400;

    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const current = startPercentage + (targetPercentage - startPercentage) * t;
      animatedPercentageRef.current = current;
      setAnimatedPercentage(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [optimisticTasks]);

  const sortedTasks = useMemo(() => {
    return [...optimisticTasks].sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  }, [optimisticTasks]);

  const completedCount = optimisticTasks.filter(t => t.status === "completed").length;

  const formatShortDate = (date: Date) => {
    return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date);
  };

  const formatShortDateTime = (date: Date) => {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const handleCheckboxToggle = (task: Task) => {
    if (isReadOnly || task.id < 0) return;

    const newStatus: Task["status"] =
      task.status === "completed" ? "pending" : "completed";

    setOptimisticTasks((prev) => {
      const updated = prev.map(t => 
        t.id === task.id 
          ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date() : null }
          : t
      );
      
      // If marking as complete, scroll to the next incomplete task
      if (newStatus === "completed") {
        const sortedUpdated = [...updated].sort((a, b) => {
          if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
          if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          return 0;
        });
        
        const currentIndex = sortedUpdated.findIndex(t => t.id === task.id);
        const nextIncomplete = sortedUpdated.find((t, idx) => idx > currentIndex && t.status !== "completed");
        
        if (nextIncomplete) {
          // Highlight the next task briefly
          setHighlightedTaskId(nextIncomplete.id);
          setTimeout(() => setHighlightedTaskId(null), 2000);
          
          setTimeout(() => {
            const nextElement = taskRefs.current.get(nextIncomplete.id);
            if (nextElement && scrollContainerRef.current) {
              nextElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
            }
          }, 100);
        }
      }
      
      return updated;
    });
    
    onTaskStatusChange(task.id, newStatus);
  };

  if (!mounted) {
    return (
      <div className="w-full h-full overflow-y-auto bg-bg-primary">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-tertiary rounded-[12px] mx-4 mb-4"></div>
          <div className="h-4 bg-bg-tertiary rounded-[12px] mx-4 mb-8"></div>
          <div className="h-32 bg-bg-tertiary rounded-[12px] mx-4 mb-4"></div>
          <div className="h-32 bg-bg-tertiary rounded-[12px] mx-4"></div>
        </div>
      </div>
    );
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md">
          <div className="w-[60px] h-[60px] rounded-full kairos-bg-tertiary flex items-center justify-center mx-auto mb-4">
            <Clock size={26} className="kairos-fg-secondary" strokeWidth={2.2} />
          </div>
          <h3 className="text-[17px] font-[590] kairos-fg-primary kairos-font-body mb-2">
            {t("timeline.emptyTitle")}
          </h3>
          <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] kairos-fg-tertiary kairos-font-body">
            {t("timeline.emptyDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-full px-4">
        {/* Header */}
        <div className="pt-8 pb-6">
          <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.022em] kairos-fg-primary kairos-font-display mb-2">
            {projectTitle ?? t("timeline.title")}
          </h1>
          <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] kairos-fg-tertiary kairos-font-body">
            {t("timeline.progressLine", { count: sortedTasks.length })}
          </p>
        </div>

        {/* Progress Section */}
        <div className="mb-8">
          <div className="kairos-bg-surface rounded-[10px] p-4 sm:p-6 kairos-section-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[17px] leading-[1.235] tracking-[-0.016em] kairos-fg-primary kairos-font-body font-[590] mb-1">
                  Project Progress
                </div>
                <div className="text-[13px] leading-[1.3846] tracking-[-0.006em] kairos-fg-secondary kairos-font-caption">
                  {t("timeline.completedLine", { completed: completedCount, total: sortedTasks.length })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[34px] font-[700] leading-[1.1] tracking-[-0.022em] kairos-accent-primary mb-1">
                  {Math.round(animatedPercentage)}%
                </div>
              </div>
            </div>

            <div className="relative w-full h-[6px] kairos-bg-tertiary rounded-full overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${animatedPercentage}%`,
                  background: animatedPercentage === 0 
                    ? 'transparent'
                    : 'linear-gradient(90deg, rgb(var(--accent-primary)), rgb(var(--accent-secondary)))',
                }}
              />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-2">
          <h2 className="text-[13px] leading-[1.3846] tracking-[-0.006em] kairos-fg-secondary kairos-font-caption mb-3 px-1 uppercase tracking-wide">
            Tasks ({sortedTasks.length})
          </h2>
          
          <div className="space-y-2">
            {sortedTasks.map((task) => {
              const isCompleted = task.status === "completed";
              const isExpanded = expandedTaskId === task.id;
              const isOverdue = !!task.dueDate && !isCompleted && new Date(task.dueDate).getTime() < Date.now();
              const isHighlighted = highlightedTaskId === task.id;
              
              return (
                <div 
                  key={task.id}
                  ref={(el) => {
                    if (el) taskRefs.current.set(task.id, el);
                    else taskRefs.current.delete(task.id);
                  }}
                  className={`kairos-bg-surface rounded-[10px] overflow-hidden kairos-section-border ${isHighlighted ? "ring-2 ring-accent-primary/50" : ""}`}
                  onMouseEnter={() => setHoveredTaskId(task.id)}
                  onMouseLeave={() => setHoveredTaskId(null)}
                >
                  <div 
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedTaskId((prev) => (prev === task.id ? null : task.id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedTaskId((prev) => (prev === task.id ? null : task.id));
                      }
                    }}
                    className="w-full flex items-center justify-between pl-4 pr-[18px] py-[11px] active:kairos-active-state transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckboxToggle(task);
                        }}
                        disabled={isReadOnly || task.id < 0}
                        className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? "kairos-accent-primary/15"
                            : "kairos-bg-tertiary"
                        } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                        aria-label={isCompleted ? t("timeline.markIncomplete") : t("timeline.markComplete")}
                      >
                        {isCompleted && (
                          <Check size={18} className="kairos-accent-primary" strokeWidth={3} />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-[17px] leading-[1.235] tracking-[-0.016em] kairos-fg-primary kairos-font-body font-[590] truncate ${
                            isCompleted ? "line-through kairos-fg-tertiary" : ""
                          }`}>
                            {task.title}
                          </h4>
                          
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            task.priority === "urgent" 
                              ? "bg-error/10 text-error"
                              : task.priority === "high"
                              ? "bg-orange-500/10 text-orange-500"
                              : task.priority === "medium"
                              ? "bg-warning/10 text-warning"
                              : "bg-accent-primary/10 kairos-accent-primary"
                          }`}>
                            {t(
                              task.priority === "urgent"
                                ? "taskForm.priorityUrgent"
                                : task.priority === "high"
                                ? "taskForm.priorityHigh"
                                : task.priority === "medium"
                                ? "taskForm.priorityMedium"
                                : "taskForm.priorityLow",
                            )}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-[13px] leading-[1.3846] tracking-[-0.006em] kairos-fg-secondary kairos-font-caption">
                          {task.dueDate && (
                            <div className="flex items-center gap-1">
                              <Clock size={12} className={isOverdue ? "text-error" : "kairos-accent-primary"} strokeWidth={2.2} />
                              <span>{formatShortDate(new Date(task.dueDate))}</span>
                              {isOverdue && (
                                <span className="text-error font-semibold">• Overdue</span>
                              )}
                            </div>
                          )}
                          
                          {task.assignedTo && (
                            <div className="flex items-center gap-1">
                              <span>•</span>
                              <User size={12} className="kairos-accent-primary" strokeWidth={2.2} />
                              <span>{task.assignedTo.name ?? t("team.unknownUser")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <ChevronDown 
                      size={20} 
                      className={`kairos-fg-tertiary transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      strokeWidth={2.5}
                    />
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t kairos-divider pt-4">
                      {task.description && (
                        <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] kairos-fg-secondary kairos-font-body mb-4">
                          {task.description}
                        </p>
                      )}

                      <div className="space-y-3">
                        {task.createdBy && (
                          <div className="flex items-center gap-2 text-[13px] kairos-fg-secondary">
                            <span className="opacity-70">{t("timeline.createdBy")}</span>
                            <div className="flex items-center gap-1.5">
                              {task.createdBy.image ? (
                                <Image 
                                  src={task.createdBy.image} 
                                  alt={task.createdBy.name ?? "User"}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                                  <span className="text-[11px] font-[590] text-white">
                                    {task.createdBy.name?.[0]?.toUpperCase() ?? "?"}
                                  </span>
                                </div>
                              )}
                              <span className="font-semibold">{task.createdBy.name ?? t("team.unknownUser")}</span>
                            </div>
                          </div>
                        )}

                        {task.lastEditedBy && task.lastEditedAt && (
                          <div className="flex items-center gap-2 text-[13px] text-warning">
                            <Clock size={12} strokeWidth={2.2} />
                            <span className="opacity-70">{t("timeline.lastModified")}</span>
                            <div className="flex items-center gap-1.5">
                              {task.lastEditedBy.image ? (
                                <Image 
                                  src={task.lastEditedBy.image} 
                                  alt={task.lastEditedBy.name ?? "User"}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
                                  <span className="text-[11px] font-[590] text-white">
                                    {task.lastEditedBy.name?.[0]?.toUpperCase() ?? "?"}
                                  </span>
                                </div>
                              )}
                              <span className="font-semibold">{task.lastEditedBy.name ?? t("team.unknownUser")}</span>
                              <span className="opacity-60">•</span>
                              <span className="opacity-70">
                                {formatShortDateTime(new Date(task.lastEditedAt))}
                              </span>
                            </div>
                          </div>
                        )}

                        {isCompleted && task.completedBy && (
                          <div className="flex items-center gap-2 text-[13px] text-success">
                            <CheckCircle2 size={12} strokeWidth={2.2} />
                            <span className="opacity-70">{t("timeline.completedBy")}</span>
                            <div className="flex items-center gap-1.5">
                              {task.completedBy.image ? (
                                <Image 
                                  src={task.completedBy.image} 
                                  alt={task.completedBy.name ?? "User"}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center">
                                  <span className="text-[11px] font-[590] text-white">
                                    {task.completedBy.name?.[0]?.toUpperCase() ?? "?"}
                                  </span>
                                </div>
                              )}
                              <span className="font-semibold">{task.completedBy.name ?? t("team.unknownUser")}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Mark Complete/Incomplete Button */}
                        {!isReadOnly && task.id >= 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCheckboxToggle(task);
                            }}
                            className={`mt-2 py-2 px-4 rounded-lg text-[13px] font-medium tracking-tight transition-all duration-300 flex items-center gap-2 w-fit ${
                              isCompleted
                                ? "kairos-bg-tertiary kairos-fg-tertiary hover:bg-bg-tertiary/80"
                                : "bg-accent-primary text-white hover:bg-accent-primary/90"
                            }`}
                          >
                            <Check size={14} strokeWidth={3} />
                            <span>{isCompleted ? t("timeline.markIncomplete") : t("timeline.markComplete")}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}