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
        return "bg-[#9448F2] border-[#9448F2]";
      case "blocked":
        return "bg-red-500 border-red-500";
      default:
        return "bg-white border-[#DDE3E9]";
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-l-red-500";
      case "high":
        return "border-l-orange-500";
      case "medium":
        return "border-l-[#FFC53D]";
      default:
        return "border-l-[#80C49B]";
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
    <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9] p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-[#222B32]">Timeline</h3>
          <span className="text-sm font-semibold text-[#59677C]">
            {Math.round(completionPercentage)}%
          </span>
        </div>
        
        <div className="w-full bg-[#DDE3E9] rounded-full h-2 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#9448F2] to-[#80C49B] transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-[#59677C] text-sm">
            No tasks yet
          </div>
        ) : (
          sortedTasks.map((task, index) => (
            <div 
              key={task.id} 
              className="relative flex items-start gap-3 group"
            >
              {index < sortedTasks.length - 1 && (
                <div 
                  className={`absolute left-[13px] top-8 w-0.5 h-full transition-colors ${
                    task.status === "completed" ? "bg-[#80C49B]" : "bg-[#DDE3E9]"
                  }`}
                />
              )}

              <div className="relative z-10 flex-shrink-0">
                <button
                  onClick={() => handleCheckboxToggle(task)}
                  disabled={isReadOnly || task.id < 0}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    getStatusColor(task.status)
                  } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"}`}
                >
                  {getStatusIcon(task.status)}
                </button>
              </div>

              <div 
                className={`flex-1 p-4 rounded-lg border-l-4 transition-all ${
                  task.status === "completed" 
                    ? "bg-[#80C49B]/5" 
                    : "bg-white border"
                } ${getPriorityColor(task.priority)} border-[#DDE3E9] hover:shadow-sm`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-semibold text-[#222B32] text-sm ${
                    task.status === "completed" ? "line-through opacity-60" : ""
                  }`}>
                    {task.title}
                  </h4>
                  
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    task.priority === "urgent" 
                      ? "bg-red-100 text-red-700"
                      : task.priority === "high"
                      ? "bg-orange-100 text-orange-700"
                      : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-[#80C49B]/20 text-[#80C49B]"
                  }`}>
                    {task.priority}
                  </span>
                </div>

                {task.description && (
                  <p className="text-xs text-[#59677C] mb-3">{task.description}</p>
                )}

                <div className="flex flex-wrap gap-3 items-center text-xs text-[#59677C]">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {task.assignedTo && (
                    <div className="flex items-center gap-2">
                      {task.assignedTo.image ? (
                        <Image 
                          src={task.assignedTo.image} 
                          alt={task.assignedTo.name ?? "User"}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#9448F2] to-[#80C49B] flex items-center justify-center text-white text-[10px]">
                          {task.assignedTo.name?.[0] ?? "?"}
                        </div>
                      )}
                      <span>{task.assignedTo.name ?? "Unassigned"}</span>
                    </div>
                  )}
                </div>

                {task.completedAt && (
                  <div className="mt-2 text-xs text-[#80C49B] font-medium">
                    ✓ {new Date(task.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}