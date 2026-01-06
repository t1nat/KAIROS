"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Clock, User, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { interpolateNumber, timer } from "d3";

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
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof timer> | null>(null);
  const animatedPercentageRef = useRef(0);
    
  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    const targetPercentage = optimisticTasks.length === 0 
      ? 0 
      : (optimisticTasks.filter(t => t.status === "completed").length / optimisticTasks.length) * 100;

    if (timerRef.current) timerRef.current.stop();

    const startPercentage = animatedPercentageRef.current;
    const duration = 400;

    const interp = interpolateNumber(startPercentage, targetPercentage);

    timerRef.current = timer((elapsed: number) => {
      const t = Math.min(elapsed / duration, 1);
      const current = interp(t); // Linear interpolation - constant speed
      animatedPercentageRef.current = current;
      setAnimatedPercentage(current);
      if (t >= 1) timerRef.current?.stop();
    });

    return () => {
      if (timerRef.current) timerRef.current.stop();
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
    
    const newStatus = task.status === "completed" ? "pending" : "completed";
    
    setOptimisticTasks(prev => 
      prev.map(t => 
        t.id === task.id 
          ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date() : null }
          : t
      )
    );
    
    onTaskStatusChange(task.id, newStatus);
  };

  if (sortedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-bg-surface flex items-center justify-center mx-auto mb-6 border border-border-light/30">
            <Clock size={32} className="text-fg-primary" />
          </div>
          <h3 className="text-2xl font-bold text-fg-primary mb-3">{t("timeline.emptyTitle")}</h3>
          <p className="text-fg-secondary mb-6">{t("timeline.emptyDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-[500px] p-6 md:p-8">
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-fg-primary mb-2">
              {projectTitle ?? t("timeline.title")}
            </h2>
            <p className="text-fg-secondary text-sm">
              {t("timeline.progressLine", { count: sortedTasks.length })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-success mb-1">
              {Math.round(animatedPercentage)}%
            </div>
            <div className="text-xs text-fg-secondary font-medium">
              {t("timeline.completedLine", { completed: completedCount, total: sortedTasks.length })}
            </div>
          </div>
        </div>

        <div className="relative w-full h-3 bg-bg-surface/60 rounded-full overflow-hidden border border-border-light/30">
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-[width,opacity] duration-300"
            style={{
              width: `${animatedPercentage}%`,
              opacity: animatedPercentage <= 0 ? 0 : 1,
              background: "rgb(var(--success) / 0.85)",
            }}
          />
        </div>
      </div>

      <div className="relative flex-1 pb-8">
        <div
          className="absolute top-[52px] left-0 h-[3px] transition-[width,opacity] duration-300"
          style={{
            width: `${animatedPercentage}%`,
            opacity: animatedPercentage <= 0 ? 0 : 1,
            background: "rgb(var(--success) / 0.85)",
          }}
          aria-hidden
        />
        
        <div className="relative flex items-start gap-6 md:gap-8 overflow-x-auto pb-4 scrollbar-thin scroll-smooth snap-x snap-mandatory">
          {sortedTasks.map((task, index) => {
            const isCompleted = task.status === "completed";
            const isHovered = hoveredTaskId === task.id;
            const isExpanded = expandedTaskId === task.id;
            const isOverdue = !!task.dueDate && !isCompleted && new Date(task.dueDate).getTime() < Date.now();
            
            return (
              <div 
                key={task.id}
                className="relative flex-shrink-0 w-72 group animate-fadeInUp snap-start"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
              >
                <div className={`absolute left-1/2 -translate-x-1/2 w-[2px] h-12 transition-all duration-300 ${
                  isCompleted 
                    ? "bg-gradient-to-b from-success to-transparent" 
                    : "bg-gradient-to-b from-border-light/70 to-transparent"
                }`} />

                <div className="absolute left-1/2 -translate-x-1/2 top-[42px] z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckboxToggle(task);
                    }}
                    disabled={isReadOnly || task.id < 0}
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/30 ${
                      isCompleted
                        ? "bg-success border-success"
                        : "bg-bg-primary border-border-medium/70 hover:border-success"
                    } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    aria-label={isCompleted ? t("timeline.markIncomplete") : t("timeline.markComplete")}
                  >
                    {isCompleted && (
                      <Check size={16} className="text-white" />
                    )}
                  </button>
                </div>

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
                  className={`mt-24 bg-bg-surface rounded-xl p-5 border transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/20 ${
                    isCompleted 
                      ? "border-success/30 bg-success/5" 
                      : "border-border-light/30 hover:border-border-medium/50 hover:bg-bg-elevated"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      task.priority === "urgent" 
                        ? "bg-red-500/20 text-red-400"
                        : task.priority === "high"
                        ? "bg-orange-500/20 text-orange-400"
                        : task.priority === "medium"
                        ? "bg-warning/15 text-warning"
                        : "bg-success/15 text-success"
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
                    </div>
                    
                    {isCompleted && (
                      <div className="flex items-center gap-1.5 text-success">
                        <CheckCircle2 size={14} />
                        <span className="text-xs font-semibold">{t("timeline.done")}</span>
                      </div>
                    )}
                  </div>

                  <h4 className={`font-bold text-fg-primary mb-2 leading-snug ${
                    isCompleted ? "line-through text-fg-secondary" : ""
                  }`}>
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-sm text-fg-secondary mb-4 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-fg-secondary flex-wrap">
                    {task.dueDate && (
                      <div className={`flex items-center gap-1.5 bg-bg-surface/60 px-2 py-1 rounded-md border ${
                        isOverdue ? "border-error/40" : "border-border-light/20"
                      }`}>
                        <Clock size={12} className={isOverdue ? "text-error" : "text-accent-primary"} />
                        <span>{formatShortDate(new Date(task.dueDate))}</span>
                        {isOverdue && (
                          <span className="ml-1 text-error font-semibold">{t("timeline.overdue")}</span>
                        )}
                      </div>
                    )}

                    {task.assignedTo && (
                      <div className="flex items-center gap-1.5 bg-bg-surface/60 px-2 py-1 rounded-md border border-border-light/20">
                        {task.assignedTo.image ? (
                          <Image 
                            src={task.assignedTo.image} 
                            alt={task.assignedTo.name ?? "User"}
                            width={16}
                            height={16}
                            className="rounded-full ring-1 ring-accent-primary/30"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center text-white text-[8px] font-bold">
                            {task.assignedTo.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <span className="font-medium">{task.assignedTo.name ?? t("team.unknownUser")}</span>
                      </div>
                    )}
                  </div>

                  {(isHovered || isExpanded) && (
                    <div className="mt-4 pt-4 border-t border-border-light/20 space-y-2 animate-fadeIn">
                      {task.createdBy && (
                        <div className="flex items-center gap-2 text-xs text-fg-secondary">
                          <User size={12} className="text-accent-primary" />
                          <span className="opacity-70">{t("timeline.createdBy")}</span>
                          <div className="flex items-center gap-1.5">
                            {task.createdBy.image ? (
                              <Image 
                                src={task.createdBy.image} 
                                alt={task.createdBy.name ?? "User"}
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-[8px] font-bold">
                                {task.createdBy.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="font-semibold">{task.createdBy.name ?? t("team.unknownUser")}</span>
                          </div>
                        </div>
                      )}

                      {task.lastEditedBy && task.lastEditedAt && (
                        <div className="flex items-center gap-2 text-xs text-warning">
                          <Clock size={12} />
                          <span className="opacity-70">{t("timeline.lastModified")}</span>
                          <div className="flex items-center gap-1.5">
                            {task.lastEditedBy.image ? (
                              <Image 
                                src={task.lastEditedBy.image} 
                                alt={task.lastEditedBy.name ?? "User"}
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center text-bg-primary text-[8px] font-bold">
                                {task.lastEditedBy.name?.[0]?.toUpperCase() ?? "?"}
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
                        <div className="flex items-center gap-2 text-xs text-success">
                          <CheckCircle2 size={12} />
                          <span className="opacity-70">{t("timeline.completedBy")}</span>
                          <div className="flex items-center gap-1.5">
                            {task.completedBy.image ? (
                              <Image 
                                src={task.completedBy.image} 
                                alt={task.completedBy.name ?? "User"}
                                width={16}
                                height={16}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center text-white text-[8px] font-bold">
                                {task.completedBy.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="font-semibold">{task.completedBy.name ?? t("team.unknownUser")}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeInUp,
          .animate-scaleIn,
          .animate-fadeIn {
            animation: none !important;
          }
        }

        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgb(var(--border-light) / 0.18);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgb(var(--accent-primary) / 0.35);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgb(var(--accent-primary) / 0.55);
        }
      `}</style>
    </div>
  );
}