"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Check, Clock } from "lucide-react";
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
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  // FIX APPLIED (Previously added fix for Type error: Expected 1 arguments, but got 0.)
  const animationFrameRef = useRef<number | null>(null);
    
  useEffect(() => {
    setOptimisticTasks(tasks);
  }, [tasks]);

  // Animate progress bar changes
  useEffect(() => {
    const targetPercentage = optimisticTasks.length === 0 
      ? 0 
      : (optimisticTasks.filter(t => t.status === "completed").length / optimisticTasks.length) * 100;
    
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Smooth animation from current to target percentage
    const startPercentage = animatedPercentage;
    const difference = targetPercentage - startPercentage;
    const duration = 800; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const current = startPercentage + (difference * easeOutCubic);
      setAnimatedPercentage(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup
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
    
    // Optimistically update the UI
    setOptimisticTasks(prev => 
      prev.map(t => 
        t.id === task.id 
          ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date() : null }
          : t
      )
    );
    
    // Call the actual mutation
    onTaskStatusChange(task.id, newStatus);
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#FBF9F5]">Timeline</h3>
          <span className="text-sm font-medium text-[#A343EC] transition-all duration-300">
            {completedCount} / {sortedTasks.length}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-[#A343EC] rounded-full shadow-lg shadow-[#A343EC]/30 transition-shadow duration-300"
            style={{ 
              width: `${animatedPercentage}%`,
              transition: 'width 0ms' // Handled by requestAnimationFrame
            }}
          />
          {/* Glow effect when completing */}
          {animatedPercentage > 0 && (
            <div 
              className="absolute top-0 left-0 h-full bg-[#A343EC]/30 blur-md rounded-full"
              style={{ 
                width: `${animatedPercentage}%`,
                transition: 'width 0ms'
              }}
            />
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[11px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#A343EC]/40 via-[#A343EC]/20 to-transparent" />

        <div className="space-y-6">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-16 text-[#59677C] text-sm">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Clock size={20} className="text-[#A343EC]/50" />
              </div>
              <p>No tasks yet</p>
            </div>
          ) : (
            sortedTasks.map((task, index) => (
              <div 
                key={task.id} 
                className="relative pl-10 group animate-fadeInUp"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'both'
                }}
              >
                {/* Timeline Dot */}
                <button
                  onClick={() => handleCheckboxToggle(task)}
                  disabled={isReadOnly || task.id < 0}
                  className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    task.status === "completed"
                      ? "bg-[#A343EC] border-[#A343EC] shadow-lg shadow-[#A343EC]/40 scale-110"
                      : "bg-[#181F25] border-[#A343EC]/30 hover:border-[#A343EC] hover:scale-110"
                  } ${isReadOnly || task.id < 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  {task.status === "completed" && (
                    <Check size={12} className="text-white animate-scaleIn" />
                  )}
                </button>

                {/* Task Card */}
                <div 
                  className={`bg-white/5 backdrop-blur-sm rounded-lg p-4 transition-all duration-300 border ${
                    task.status === "completed" 
                      ? "border-[#A343EC]/30 opacity-60" 
                      : "border-white/10 hover:border-[#A343EC]/50 hover:bg-white/10"
                  }`}
                >
                  {/* Title */}
                  <h4 className={`font-semibold text-[#FBF9F5] mb-2 transition-all duration-300 ${
                    task.status === "completed" ? "line-through text-[#FBF9F5]/60" : ""
                  }`}>
                    {task.title}
                  </h4>

                  {/* Description */}
                  {task.description && (
                    <p className="text-sm text-[#E4DEAA] mb-3 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 items-center text-xs text-[#E4DEAA]">
                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[#A343EC]" />
                        <span>{new Date(task.dueDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: new Date(task.dueDate).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                        })}</span>
                      </div>
                    )}

                    {/* Assignee */}
                    {task.assignedTo && (
                      <div className="flex items-center gap-2">
                        {task.assignedTo.image ? (
                          <Image 
                            src={task.assignedTo.image} 
                            alt={task.assignedTo.name ?? "User"}
                            width={18}
                            height={18}
                            className="rounded-full ring-2 ring-[#A343EC]/30"
                          />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full bg-[#A343EC] flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-[#A343EC]/30">
                            {task.assignedTo.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Priority Indicator */}
                    <div className={`ml-auto px-2 py-1 rounded-md text-[10px] font-medium uppercase tracking-wide ${
                      task.priority === "urgent" 
                        ? "bg-[#A343EC]/20 text-[#A343EC]"
                        : task.priority === "high"
                        ? "bg-[#A343EC]/15 text-[#A343EC]"
                        : task.priority === "medium" // FIX APPLIED: Correctly chained ternary and checked for 'medium'
                        ? "bg-[#A343EC]/10 text-[#A343EC]"
                        : "bg-white/5 text-[#E4DEAA]"
                    }`}>
                      {task.priority}
                    </div>

                    {/* Completed Badge */}
                    {task.completedAt && (
                      <div className="flex items-center gap-1.5 text-[#A343EC] ml-2">
                        <Check size={12} />
                        <span className="font-medium">Done</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}