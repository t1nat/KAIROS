"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Clock, User, CheckCircle2 } from "lucide-react";
import Image from "next/image";

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
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [hoveredTaskId, setHoveredTaskId] = useState<number | null>(null);
  
  const animationFrameRef = useRef<number | null>(null);
    
  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  // Animate progress bar changes
  useEffect(() => {
    const targetPercentage = optimisticTasks.length === 0 
      ? 0 
      : (optimisticTasks.filter(t => t.status === "completed").length / optimisticTasks.length) * 100;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startPercentage = animatedPercentage;
    const difference = targetPercentage - startPercentage;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = startPercentage + (difference * easeOutCubic);
      setAnimatedPercentage(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [optimisticTasks, animatedPercentage]);

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
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Clock size={32} className="text-[#A343EC]/50" />
          </div>
          <h3 className="text-2xl font-bold text-[#FBF9F5] mb-3">No Tasks Yet</h3>
          <p className="text-[#E4DEAA] mb-6">Create your first task to get started with your project timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-[500px] p-8">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-[#FBF9F5] mb-2">
              {projectTitle ?? "Project Timeline"}
            </h2>
            <p className="text-[#E4DEAA] text-sm">
              Track progress across {sortedTasks.length} {sortedTasks.length === 1 ? "task" : "tasks"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-[#A343EC] mb-1">
              {Math.round(animatedPercentage)}%
            </div>
            <div className="text-xs text-[#E4DEAA] font-medium">
              {completedCount} / {sortedTasks.length} Complete
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#A343EC] to-[#9448F2] rounded-full shadow-lg shadow-[#A343EC]/40 transition-shadow duration-300"
            style={{ width: `${animatedPercentage}%` }}
          />
          {animatedPercentage > 0 && animatedPercentage < 100 && (
            <div 
              className="absolute top-0 left-0 h-full bg-[#A343EC]/30 blur-lg"
              style={{ width: `${animatedPercentage}%` }}
            />
          )}
        </div>
      </div>

      {/* Horizontal Timeline */}
      <div className="relative flex-1 pb-8">
        {/* Main Timeline Line */}
        <div className="absolute top-[52px] left-0 right-0 h-[3px] bg-gradient-to-r from-[#A343EC]/20 via-[#A343EC]/40 to-[#A343EC]/20" />
        
        {/* Tasks Container - Horizontal Scroll */}
        <div className="relative flex items-start gap-8 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#A343EC]/30 scrollbar-track-white/5">
          {sortedTasks.map((task, index) => {
            const isCompleted = task.status === "completed";
            const isHovered = hoveredTaskId === task.id;
            
            return (
              <div 
                key={task.id}
                className="relative flex-shrink-0 w-72 group animate-fadeInUp"
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animationFillMode: 'both'
                }}
                onMouseEnter={() => setHoveredTaskId(task.id)}
                onMouseLeave={() => setHoveredTaskId(null)}
              >
                {/* Vertical connector line */}
                <div className={`absolute left-1/2 -translate-x-1/2 w-[2px] h-12 transition-all duration-300 ${
                  isCompleted 
                    ? "bg-gradient-to-b from-[#A343EC] to-transparent" 
                    : "bg-gradient-to-b from-[#A343EC]/30 to-transparent"
                }`} />

                {/* Timeline Node/Checkpoint */}
                <div className="absolute left-1/2 -translate-x-1/2 top-[42px] z-10">
                  <button
                    onClick={() => handleCheckboxToggle(task)}
                    disabled={isReadOnly || task.id < 0}
                    className={`w-8 h-8 rounded-full border-3 flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-[#A343EC] border-[#A343EC] shadow-lg shadow-[#A343EC]/50 scale-110"
                        : "bg-[#181F25] border-[#A343EC]/40 hover:border-[#A343EC] hover:scale-110"
                    } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    {isCompleted && (
                      <Check size={16} className="text-white animate-scaleIn" />
                    )}
                  </button>
                </div>

                {/* Task Card */}
                <div 
                  className={`mt-24 bg-white/5 backdrop-blur-sm rounded-xl p-5 border transition-all duration-300 ${
                    isCompleted 
                      ? "border-[#A343EC]/40 opacity-70" 
                      : "border-white/10 hover:border-[#A343EC]/50 hover:bg-white/10 hover:shadow-lg hover:shadow-[#A343EC]/20"
                  } ${isHovered ? "scale-105" : ""}`}
                >
                  {/* Priority Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      task.priority === "urgent" 
                        ? "bg-red-500/20 text-red-400"
                        : task.priority === "high"
                        ? "bg-orange-500/20 text-orange-400"
                        : task.priority === "medium"
                        ? "bg-[#F8D45E]/20 text-[#F8D45E]"
                        : "bg-[#80C49B]/20 text-[#80C49B]"
                    }`}>
                      {task.priority}
                    </div>
                    
                    {isCompleted && (
                      <div className="flex items-center gap-1.5 text-[#A343EC]">
                        <CheckCircle2 size={14} />
                        <span className="text-xs font-semibold">Done</span>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className={`font-bold text-[#FBF9F5] mb-2 leading-snug transition-all duration-300 ${
                    isCompleted ? "line-through text-[#FBF9F5]/60" : ""
                  }`}>
                    {task.title}
                  </h4>

                  {/* Description */}
                  {task.description && (
                    <p className="text-sm text-[#E4DEAA]/80 mb-4 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex items-center gap-3 text-xs text-[#E4DEAA] flex-wrap">
                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                        <Clock size={12} className="text-[#A343EC]" />
                        <span>{new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })}</span>
                      </div>
                    )}

                    {/* Assignee */}
                    {task.assignedTo && (
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                        {task.assignedTo.image ? (
                          <Image 
                            src={task.assignedTo.image} 
                            alt={task.assignedTo.name ?? "User"}
                            width={16}
                            height={16}
                            className="rounded-full ring-1 ring-[#A343EC]/30"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-[#A343EC] flex items-center justify-center text-white text-[8px] font-bold">
                            {task.assignedTo.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <span className="font-medium">{task.assignedTo.name ?? "Assigned"}</span>
                      </div>
                    )}
                  </div>

                  {/* Hover Info - Creator, Completer & Last Editor */}
                  {isHovered && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 animate-fadeIn">
                      {/* Created By */}
                      {task.createdBy && (
                        <div className="flex items-center gap-2 text-xs text-[#E4DEAA]">
                          <User size={12} className="text-[#A343EC]" />
                          <span className="opacity-70">Created by:</span>
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
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center text-white text-[8px] font-bold">
                                {task.createdBy.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="font-semibold">{task.createdBy.name ?? "Unknown"}</span>
                          </div>
                        </div>
                      )}

                      {/* Last Modified By */}
                      {task.lastEditedBy && task.lastEditedAt && (
                        <div className="flex items-center gap-2 text-xs text-[#F8D45E]">
                          <Clock size={12} />
                          <span className="opacity-70">Last modified:</span>
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
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#F8D45E] to-[#F8D45E]/80 flex items-center justify-center text-[#181F25] text-[8px] font-bold">
                                {task.lastEditedBy.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="font-semibold">{task.lastEditedBy.name ?? "Unknown"}</span>
                            <span className="opacity-60">•</span>
                            <span className="opacity-70">
                              {new Date(task.lastEditedAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Completed By */}
                      {isCompleted && task.completedBy && (
                        <div className="flex items-center gap-2 text-xs text-[#80C49B]">
                          <CheckCircle2 size={12} />
                          <span className="opacity-70">Completed by:</span>
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
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#80C49B] to-[#80C49B]/80 flex items-center justify-center text-white text-[8px] font-bold">
                                {task.completedBy.name?.[0]?.toUpperCase() ?? "?"}
                              </div>
                            )}
                            <span className="font-semibold">{task.completedBy.name ?? "Unknown"}</span>
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

        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgba(163, 67, 236, 0.3);
          border-radius: 3px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgba(163, 67, 236, 0.5);
        }
      `}</style>
    </div>
  );
}