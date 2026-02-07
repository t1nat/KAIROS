"use client";

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Brain,
  Zap,
  X,
} from "lucide-react";
import { api } from "~/trpc/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedTask {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  orderIndex: number;
  estimatedDueDays: number | null;
}

interface AiTaskDraftPanelProps {
  projectId: number;
  projectTitle: string;
  projectDescription: string | null;
  onAddTask: (task: {
    title: string;
    description: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
  }) => void;
  onAddAllTasks: (
    tasks: Array<{
      title: string;
      description: string;
      priority: "low" | "medium" | "high" | "urgent";
      dueDate?: Date;
    }>,
  ) => void;
}

// ---------------------------------------------------------------------------
// Priority config
// ---------------------------------------------------------------------------

const priorityConfig = {
  low: { color: "text-green-500", bg: "bg-green-500/10", dot: "bg-green-500" },
  medium: {
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    dot: "bg-yellow-500",
  },
  high: {
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    dot: "bg-orange-500",
  },
  urgent: { color: "text-red-500", bg: "bg-red-500/10", dot: "bg-red-500" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiTaskDraftPanel({
  projectId,
  projectTitle: _projectTitle,
  projectDescription,
  onAddTask,
  onAddAllTasks,
}: AiTaskDraftPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [extraInstructions, setExtraInstructions] = useState("");
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(
    new Set(),
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const generateMutation = api.agent.generateTaskDrafts.useMutation({
    onSuccess: (data: { tasks: GeneratedTask[]; reasoning: string }) => {
      setGeneratedTasks(data.tasks);
      setReasoning(data.reasoning);
      setAddedTaskIndices(new Set());
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      projectId,
      message: extraInstructions || undefined,
    });
  };

  const handleAddSingleTask = (task: GeneratedTask, index: number) => {
    const dueDate = task.estimatedDueDays
      ? new Date(Date.now() + task.estimatedDueDays * 86400000)
      : undefined;

    onAddTask({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate,
    });

    setAddedTaskIndices((prev) => new Set([...prev, index]));
  };

  const handleAddAll = () => {
    const tasksToAdd = generatedTasks
      .filter((_, i) => !addedTaskIndices.has(i))
      .map((task) => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.estimatedDueDays
          ? new Date(Date.now() + task.estimatedDueDays * 86400000)
          : undefined,
      }));

    onAddAllTasks(tasksToAdd);
    setAddedTaskIndices(
      new Set(generatedTasks.map((_, i) => i)),
    );
  };

  const allAdded =
    generatedTasks.length > 0 &&
    generatedTasks.every((_, i) => addedTaskIndices.has(i));

  const hasDescription = !!projectDescription?.trim();

  return (
    <div className="w-full">
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 dark:from-purple-500/15 dark:via-blue-500/15 dark:to-cyan-500/15 border border-purple-500/20 dark:border-purple-500/30 hover:from-purple-500/15 hover:via-blue-500/15 hover:to-cyan-500/15 dark:hover:from-purple-500/20 dark:hover:via-blue-500/20 dark:hover:to-cyan-500/20 transition-all duration-300 group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="text-left">
            <span className="text-[14px] font-[510] text-gray-900 dark:text-white block leading-tight">
              AI Task Generator
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
              Generate tasks from project description
            </span>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp
            size={16}
            className="text-gray-500 dark:text-gray-400 transition-transform"
          />
        ) : (
          <ChevronDown
            size={16}
            className="text-gray-500 dark:text-gray-400 transition-transform"
          />
        )}
      </button>

      {/* Expanded Panel */}
      {isOpen && (
        <div className="mt-3 rounded-xl bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200/50 dark:border-gray-700/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {!hasDescription && (
            <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-2">
              <AlertCircle
                size={16}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-relaxed">
                Your project doesn&apos;t have a description yet. Add a
                description to get the best AI-generated tasks, or provide
                instructions below.
              </p>
            </div>
          )}

          {/* Instructions Input */}
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                Additional Instructions{" "}
                <span className="font-normal text-gray-400 dark:text-gray-500 normal-case tracking-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                placeholder="e.g., Focus on the backend API first, include testing tasks, break into 2-week sprints..."
                rows={2}
                className="w-full px-3 py-2 text-[13px] bg-white/80 dark:bg-gray-800/50 rounded-lg border border-gray-200/50 dark:border-gray-700/30 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none transition-all"
                disabled={generateMutation.isPending}
              />
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={Boolean(generateMutation.isPending) || (!hasDescription && !extraInstructions.trim())}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[13px] font-semibold hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Analyzing project...</span>
                </>
              ) : (
                <>
                  <Brain size={15} />
                  <span>Generate Task Breakdown</span>
                </>
              )}
            </button>
          </div>

          {/* Error State */}
          {generateMutation.isError && (
            <div className="mx-4 mb-4 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle
                size={14}
                className="text-red-500 mt-0.5 flex-shrink-0"
              />
              <p className="text-[12px] text-red-700 dark:text-red-400 leading-relaxed">
                {String(generateMutation.error?.message ?? "An error occurred")}
              </p>
            </div>
          )}

          {/* Generated Tasks */}
          {generatedTasks.length > 0 && (
            <div className="border-t border-gray-200/50 dark:border-gray-700/30">
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-purple-500" />
                  <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    {generatedTasks.length} tasks generated
                  </span>
                </div>
                {!allAdded && (
                  <button
                    type="button"
                    onClick={handleAddAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    Add All
                  </button>
                )}
              </div>

              {/* Reasoning */}
              {reasoning && (
                <div className="mx-4 mb-3 px-3 py-2 bg-blue-500/5 dark:bg-blue-500/10 rounded-lg border border-blue-500/10">
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 leading-relaxed">
                    <span className="font-semibold">AI reasoning:</span>{" "}
                    {reasoning}
                  </p>
                </div>
              )}

              {/* Task List */}
              <div className="px-4 pb-4 space-y-2">
                {generatedTasks.map((task, index) => {
                  const isAdded = addedTaskIndices.has(index);
                  const isExpanded = expandedIndex === index;
                  const config = priorityConfig[task.priority];

                  return (
                    <div
                      key={index}
                      className={`rounded-lg border transition-all duration-200 ${
                        isAdded
                          ? "bg-green-500/5 dark:bg-green-500/10 border-green-500/20"
                          : "bg-white/80 dark:bg-gray-800/40 border-gray-200/50 dark:border-gray-700/30 hover:border-gray-300/50 dark:hover:border-gray-600/40"
                      }`}
                    >
                      <div className="flex items-start gap-2 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedIndex(isExpanded ? null : index)
                            }
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[13px] font-medium leading-tight ${
                                  isAdded
                                    ? "text-green-700 dark:text-green-400 line-through"
                                    : "text-gray-900 dark:text-white"
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${config.dot}`}
                                />
                                {task.priority}
                              </span>
                              {task.estimatedDueDays && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  ~{task.estimatedDueDays}d
                                </span>
                              )}
                            </div>
                          </button>

                          {isExpanded && task.description && (
                            <p className="mt-2 text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed animate-in fade-in duration-200">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddSingleTask(task, index)}
                          disabled={isAdded}
                          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                            isAdded
                              ? "bg-green-500/20 text-green-600 dark:text-green-400"
                              : "bg-gray-100/80 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400"
                          }`}
                          title={isAdded ? "Added" : "Add this task"}
                        >
                          {isAdded ? (
                            <Check size={14} />
                          ) : (
                            <Plus size={14} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Close button at bottom */}
          {generatedTasks.length > 0 && allAdded && (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setGeneratedTasks([]);
                  setReasoning("");
                  setExtraInstructions("");
                  setAddedTaskIndices(new Set());
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/30 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              >
                <X size={13} />
                Close
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
