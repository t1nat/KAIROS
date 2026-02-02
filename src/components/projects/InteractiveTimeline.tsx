"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Clock, User, CheckCircle2 } from "lucide-react";
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
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const taskRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const rafRef = useRef<number | null>(null);
  const animatedPercentageRef = useRef(0);
    
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
    
    const newStatus = task.status === "completed" ? "pending" : "completed";
    
    setOptimisticTasks(prev => {
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

  if (sortedTasks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-bg-surface flex items-center justify-center mx-auto mb-6 shadow-sm">
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
            <div className="text-4xl font-bold text-accent-primary mb-1">
              {Math.round(animatedPercentage)}%
            </div>
            <div className="text-xs text-fg-secondary font-medium">
              {t("timeline.completedLine", { completed: completedCount, total: sortedTasks.length })}
            </div>
          </div>
        </div>

        <div className="relative w-full h-3 bg-bg-surface/60 rounded-full overflow-hidden shadow-sm">
          <div 
            className="absolute top-0 left-0 h-full rounded-full shadow-lg transition-all duration-300"
            style={{ 
              width: `${animatedPercentage}%`,
              background: animatedPercentage === 0 
                ? 'transparent'
                : 'linear-gradient(90deg, rgb(var(--accent-primary)), rgb(var(--accent-secondary)), rgb(var(--accent-tertiary)))',
              boxShadow: animatedPercentage === 0
                ? 'none'
                : '0 4px 12px rgb(var(--accent-primary) / 0.3)'
            }}
          />
        </div>
      </div>

      <div className="relative flex-1 pb-8">
        {/* Main timeline rail */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-[40px] h-1 bg-gradient-to-r from-transparent via-accent-primary/70 to-transparent border-y-2 border-accent-primary/40 shadow-md"
        />

        <div ref={scrollContainerRef} className="relative flex items-start gap-6 md:gap-8 overflow-x-auto pb-4 scrollbar-thin scroll-smooth snap-x snap-mandatory">
          {sortedTasks.map((task, index) => {
            const isCompleted = task.status === "completed";
            const isHovered = hoveredTaskId === task.id;
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
                className={`relative flex-shrink-0 w-72 group animate-fadeInUp snap-start ${isHighlighted ? "animate-pulse-highlight" : ""}`}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
              >
                {/* Connector from rail -> task card */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-[41px] h-[52px] w-px transition-opacity duration-300 ${
                    isCompleted
                      ? "bg-[#4E6C50]/30 dark:bg-[#DAE5D0]/20"
                      : isHovered || isExpanded
                        ? "bg-accent-primary/35"
                        : "bg-border-light/20"
                  }`}
                />

                <div className="absolute left-1/2 -translate-x-1/2 top-[26px] z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckboxToggle(task);
                    }}
                    disabled={isReadOnly || task.id < 0}
                    className={`w-8 h-8 rounded-full ring-2 ring-transparent flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-[#DAE5D0] text-[#4E6C50] dark:bg-[#3A4D39] dark:text-[#DAE5D0] shadow-lg shadow-[#4E6C50]/20 scale-110"
                        : "bg-bg-primary shadow-sm hover:shadow-md hover:scale-110"
                    } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                    aria-label={isCompleted ? t("timeline.markIncomplete") : t("timeline.markComplete")}
                  >
                    {isCompleted && (
                      <Check size={16} className="text-white animate-scaleIn" />
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
                  className={`mt-20 bg-bg-surface rounded-xl p-5 transition-all duration-300 outline-none shadow-sm hover:shadow-lg ${
                    isCompleted
                      ? "bg-[#DAE5D0]/10 dark:bg-[#3A4D39]/10"
                      : "hover:bg-bg-elevated hover:shadow-accent-primary/10"
                  } ${(isHovered || isExpanded) ? "scale-[1.03]" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      task.priority === "urgent" 
                        ? "bg-red-500/20 text-red-400"
                        : task.priority === "high"
                        ? "bg-orange-500/20 text-orange-400"
                        : task.priority === "medium"
                        ? "bg-warning/15 text-warning"
                        : "bg-[#DAE5D0]/30 text-[#4E6C50] dark:bg-[#3A4D39]/30 dark:text-[#DAE5D0]"
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
                      <div className="flex items-center gap-1.5 text-[#4E6C50] dark:text-[#DAE5D0]">
                        <CheckCircle2 size={14} />
                        <span className="text-xs font-semibold">{t("timeline.done")}</span>
                      </div>
                    )}
                  </div>

                  <h4 className={`font-bold text-fg-primary mb-2 leading-snug transition-all duration-300 ${
                    isCompleted ? "line-through text-fg-tertiary" : ""
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
                      <div className={`flex items-center gap-1.5 bg-bg-surface/60 px-2 py-1 rounded-md shadow-sm ${
                        isOverdue ? "shadow-error/10" : ""
                      }`}>
                        <Clock size={12} className={isOverdue ? "text-error" : "text-accent-primary"} />
                        <span>{formatShortDate(new Date(task.dueDate))}</span>
                        {isOverdue && (
                          <span className="ml-1 text-error font-semibold">{t("timeline.overdue")}</span>
                        )}
                      </div>
                    )}

                    {task.assignedTo && (
                      <div className="flex items-center gap-1.5 bg-bg-surface/60 px-2 py-1 rounded-md shadow-sm">
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
                      
                      {/* Mark Complete/Incomplete Button */}
                      {!isReadOnly && task.id >= 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckboxToggle(task);
                          }}
                          className={`mt-4 py-1.5 px-3 rounded-full text-[10px] font-bold tracking-tight uppercase transition-all duration-300 flex items-center gap-1.5 w-fit ${
                            isCompleted
                              ? "bg-[#DAE5D0] text-[#4E6C50] dark:bg-[#3A4D39] dark:text-[#DAE5D0] shadow-sm shadow-[#4E6C50]/10"
                              : "bg-bg-primary/40 text-fg-tertiary border border-border-light/30 hover:bg-bg-primary hover:text-fg-secondary hover:border-border-medium"
                          }`}
                        >
                          <Check size={11} strokeWidth={3} />
                          <span>{isCompleted ? t("timeline.done") : t("timeline.markComplete")}</span>
                        </button>
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
            transform: translateY(18px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
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
          animation: fadeInUp 650ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform, opacity, filter;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes pulseHighlight {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgb(var(--accent-primary) / 0.4);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 20px 4px rgb(var(--accent-primary) / 0.3);
          }
        }

        .animate-pulse-highlight {
          animation: pulseHighlight 0.6s ease-in-out 3;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-fadeInUp,
          .animate-scaleIn,
          .animate-fadeIn,
          .animate-pulse-highlight {
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