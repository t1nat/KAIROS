"use client";

import { useState, useEffect } from "react";
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
  const [sortedTasks, setSortedTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    // Sort tasks by orderIndex, then by due date
    const sorted = [...tasks].sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
    setSortedTasks(sorted);
  }, [tasks]);

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "in_progress":
        return "bg-blue-500";
      case "blocked":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "urgent":
        return "border-red-500";
      case "high":
        return "border-orange-500";
      case "medium":
        return "border-yellow-500";
      default:
        return "border-gray-300";
    }
  };

  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return <Check size={16} className="text-green-600" />;
      case "in_progress":
        return <Clock size={16} className="text-blue-600" />;
      case "blocked":
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Circle size={16} className="text-gray-400" />;
    }
  };

  const handleCheckboxToggle = (task: Task) => {
    if (isReadOnly) return;
    
    const newStatus = task.status === "completed" ? "pending" : "completed";
    onTaskStatusChange(task.id, newStatus);
  };

  const completionPercentage = tasks.length > 0 
    ? (tasks.filter(t => t.status === "completed").length / tasks.length) * 100 
    : 0;

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Project Timeline</h3>
          <span className="text-sm text-gray-600">
            {Math.round(completionPercentage)}% Complete
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks yet. Create your first task to get started!
          </div>
        ) : (
          sortedTasks.map((task, index) => (
            <div 
              key={task.id} 
              className="relative flex items-start gap-4 group"
            >
              {/* Timeline connector */}
              {index < sortedTasks.length - 1 && (
                <div 
                  className={`absolute left-[17px] top-10 w-0.5 h-full transition-colors duration-300 ${
                    task.status === "completed" ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              )}

              {/* Checkpoint circle */}
              <div className="relative z-10 flex-shrink-0">
                <button
                  onClick={() => handleCheckboxToggle(task)}
                  disabled={isReadOnly}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    task.status === "completed" 
                      ? "bg-green-500 border-green-600" 
                      : "bg-white border-gray-300 hover:border-gray-400"
                  } ${isReadOnly ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {getStatusIcon(task.status)}
                </button>
              </div>

              {/* Task card */}
              <div 
                className={`flex-1 p-4 rounded-lg border-l-4 transition-all duration-300 ${
                  task.status === "completed" 
                    ? "bg-green-50 border-green-500" 
                    : "bg-white border-gray-300"
                } ${getPriorityColor(task.priority)} shadow-sm hover:shadow-md`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className={`font-semibold text-gray-800 ${
                    task.status === "completed" ? "line-through text-gray-500" : ""
                  }`}>
                    {task.title}
                  </h4>
                  
                  {/* Status badge */}
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    task.status === "completed" 
                      ? "bg-green-100 text-green-800" 
                      : task.status === "in_progress"
                      ? "bg-blue-100 text-blue-800"
                      : task.status === "blocked"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}>
                    {task.status.replace("_", " ")}
                  </span>
                </div>

                {task.description && (
                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                )}

                <div className="flex flex-wrap gap-3 items-center text-xs text-gray-500">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {task.assignedTo && (
                    <div className="flex items-center gap-2">
                      {task.assignedTo.image ? (
                        <Image 
                          src={task.assignedTo.image} 
                          alt={task.assignedTo.name ?? "User"}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                          {task.assignedTo.name?.[0] ?? "?"}
                        </div>
                      )}
                      <span>{task.assignedTo.name ?? "Unassigned"}</span>
                    </div>
                  )}

                  <span className={`px-2 py-0.5 rounded ${
                    task.priority === "urgent" 
                      ? "bg-red-100 text-red-700"
                      : task.priority === "high"
                      ? "bg-orange-100 text-orange-700"
                      : task.priority === "medium"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
                  }`}>
                    {task.priority} priority
                  </span>
                </div>

                {task.completedAt && (
                  <div className="mt-2 text-xs text-green-600">
                    ✓ Completed {new Date(task.completedAt).toLocaleString()}
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