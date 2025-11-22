// src/app/_components/interactiveTimeline.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, Circle, Clock, AlertCircle } from "lucide-react";
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
}

interface InteractiveTimelineProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: number, newStatus: Task["status"]) => void;
  isReadOnly?: boolean;
}

export function InteractiveTimeline({ 
  tasks, 
  onTaskStatusChange,
  isReadOnly = false 
}: InteractiveTimelineProps) {
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);
  
  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

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

  const completionPercentage = useMemo(() => {
    if (optimisticTasks.length === 0) return 0;
    return (optimisticTasks.filter(t => t.status === "completed").length / optimisticTasks.length) * 100;
  }, [optimisticTasks]);

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <Check size={14} className="text-white" />;
      case "in_progress":
        return <Clock size={14} className="text-white" />;
      case "blocked":
        return <AlertCircle size={14} className="text-white" />;
      default:
        return <Circle size={14} className="text-[#59677C]" />;
    }
  };

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "bg-[#80C49B] border-[#80C49B]";
      case "in_progress":
        return "bg-[#A343EC] border-[#A343EC]";
      case "blocked":
        return "bg-red-500 border-red-500";
      default:
        return "bg-transparent border-white/20";
    }
  };

  const getPriorityIndicator = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-[#F8D45E]";
      default:
        return "bg-[#80C49B]";
    }
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

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-[#FBF9F5]">Tasks</h3>
          <span className="text-sm font-semibold text-[#E4DEEA]">
            {Math.round(completionPercentage)}% Complete
          </span>
        </div>
        
        <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#A343EC] to-[#80C49B] transition-all duration-500 rounded-full"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-12 text-[#59677C] text-sm">
            <Circle size={48} className="mx-auto mb-3 opacity-50" />
            <p>No tasks created yet</p>
          </div>
        ) : (
          sortedTasks.map((task, index) => (
            <div 
              key={task.id} 
              className="group"
            >
              <div className="relative flex items-start gap-4">
                {/* Status checkbox */}
                <div className="relative flex-shrink-0 pt-1">
                  <button
                    onClick={() => handleCheckboxToggle(task)}
                    disabled={isReadOnly || task.id < 0}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      getStatusColor(task.status)
                    } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"}`}
                  >
                    {getStatusIcon(task.status)}
                  </button>
                  
                  {/* Connecting line */}
                  {index < sortedTasks.length - 1 && (
                    <div 
                      className={`absolute left-1/2 -translate-x-1/2 top-8 w-0.5 h-12 transition-colors ${
                        task.status === "completed" ? "bg-[#80C49B]/30" : "bg-white/10"
                      }`}
                    />
                  )}
                </div>

                {/* Task content */}
                <div 
                  className={`flex-1 p-4 rounded-lg border transition-all ${
                    task.status === "completed" 
                      ? "bg-[#80C49B]/5 border-[#80C49B]/20" 
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Priority indicator */}
                      <div className={`w-1 h-14 rounded-full ${getPriorityIndicator(task.priority)} flex-shrink-0`} />
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-[#FBF9F5] text-sm mb-1 ${
                          task.status === "completed" ? "line-through opacity-60" : ""
                        }`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-[#E4DEEA] mb-3 line-clamp-2">{task.description}</p>
                        )}

                        <div className="flex flex-wrap gap-3 items-center text-xs">
                          {task.dueDate && (
                            <div className="flex items-center gap-1.5 text-[#E4DEEA]">
                              <Clock size={12} />
                              <span>{new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}

                          {task.assignedTo && (
                            <div className="flex items-center gap-2 text-[#E4DEEA]">
                              {task.assignedTo.image ? (
                                <Image 
                                  src={task.assignedTo.image} 
                                  alt={task.assignedTo.name ?? "User"}
                                  width={16}
                                  height={16}
                                  className="rounded-full ring-1 ring-white/20"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center text-white text-[9px] font-semibold ring-1 ring-white/20">
                                  {task.assignedTo.name?.[0] ?? "?"}
                                </div>
                              )}
                              <span className="text-xs">{task.assignedTo.name ?? "Unassigned"}</span>
                            </div>
                          )}

                          {task.completedAt && (
                            <div className="flex items-center gap-1.5 text-[#80C49B]">
                              <Check size={12} />
                              <span>Completed {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Priority badge */}
                    <span className={`px-2 py-1 text-[10px] font-semibold rounded-md uppercase tracking-wide flex-shrink-0 ${
                      task.priority === "urgent" 
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : task.priority === "high"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : task.priority === "medium"
                        ? "bg-[#F8D45E]/20 text-[#F8D45E] border border-[#F8D45E]/30"
                        : "bg-[#80C49B]/20 text-[#80C49B] border border-[#80C49B]/30"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}