// src/app/_components/projectsListWorkspace.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Folder, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProjectWithStats {
  id: number;
  title: string;
  description: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionPercentage: number;
}

// Type guard to check if a value has a tasks property
function hasTasks(value: unknown): value is { tasks: Array<{ status: string }> } {
  if (value == null || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;
  const tasks = v.tasks;
  if (!Array.isArray(tasks)) return false;

  return tasks.every((item) => {
    if (item == null || typeof item !== "object") return false;
    const it = item as Record<string, unknown>;
    return typeof it.status === "string";
  });
}

export function ProjectsListWorkspace() {
  const [showProjects, setShowProjects] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);
  const router = useRouter();

  // Trigger chart animation on mount
  useState(() => {
    const timer = setTimeout(() => setAnimateCharts(true), 100);
    return () => clearTimeout(timer);
  });

  const { data: projects, isLoading } = api.project.getMyProjects.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  // Don't show anything if no projects or still loading
  if (isLoading || !projects || projects.length === 0) {
    return null;
  }

  // Calculate stats for each project with proper type safety
  const projectsWithStats: ProjectWithStats[] = projects.map((project) => {
    // Safely extract tasks with type guard
    const projectTasks = hasTasks(project) ? project.tasks : [];
    
    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = projectTasks.filter((t) => t.status === "in_progress").length;
    const pendingTasks = projectTasks.filter((t) => t.status === "pending").length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      id: project.id,
      title: project.title,
      description: project.description ?? null,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      completionPercentage,
    };
  });

  // Calculate overall stats
  const totalProjects = projectsWithStats.length;
  const totalAllTasks = projectsWithStats.reduce((sum, p) => sum + p.totalTasks, 0);
  const totalCompletedTasks = projectsWithStats.reduce((sum, p) => sum + p.completedTasks, 0);
  const overallCompletion = totalAllTasks > 0 ? Math.round((totalCompletedTasks / totalAllTasks) * 100) : 0;
  const fullyCompletedProjects = projectsWithStats.filter((p) => p.completionPercentage === 100 && p.totalTasks > 0).length;

  const getProgressColor = (percentage: number): string => {
    if (percentage === 0) return "text-[#59677C]";
    if (percentage < 30) return "text-red-400";
    if (percentage < 60) return "text-orange-400";
    if (percentage < 100) return "text-[#F8D45E]";
    return "text-[#80C49B]";
  };

  const getProgressGlow = (percentage: number): string => {
    if (percentage === 0) return "shadow-[#59677C]/0";
    if (percentage < 30) return "shadow-red-400/20";
    if (percentage < 60) return "shadow-orange-400/20";
    if (percentage < 100) return "shadow-[#F8D45E]/20";
    return "shadow-[#80C49B]/30";
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Statistics Header - Floating Stats */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-[#FBF9F5] mb-2 flex items-center gap-3">
              <TrendingUp className="text-[#A343EC]" size={28} />
              Project Analytics
            </h3>
            <p className="text-sm text-[#E4DEAA]">Real-time progress across all your projects</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Overall Completion - Featured */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 group cursor-default">
            <div
              className={`radial-progress ${getProgressColor(overallCompletion)} drop-shadow-2xl ${getProgressGlow(overallCompletion)} transition-all duration-1000 ease-out`}
              style={{
                "--value": animateCharts ? overallCompletion : 0,
                "--size": "7rem",
                "--thickness": "5px",
              } as React.CSSProperties}
              role="progressbar"
              aria-valuenow={overallCompletion}
            >
              <span className="text-2xl font-bold font-faustina">{overallCompletion}%</span>
            </div>
            <div className="mt-4 text-center">
              <p className="text-xs text-[#E4DEAA] uppercase tracking-wider font-semibold font-faustina">Overall Progress</p>
              <p className="text-[10px] text-[#59677C] mt-1 font-faustina">{totalCompletedTasks} of {totalAllTasks} tasks</p>
            </div>
          </div>

          {/* Total Projects */}
          <div className="flex flex-col items-center justify-center p-6 group cursor-default hover:bg-white/5 rounded-2xl transition-all">
            <div className="relative">
              <div className="text-5xl font-bold bg-gradient-to-br from-[#A343EC] to-[#9448F2] bg-clip-text text-transparent font-faustina">
                {totalProjects}
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-[#A343EC]/20 to-[#9448F2]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <p className="text-xs text-[#E4DEAA] mt-3 uppercase tracking-wider font-semibold font-faustina">Active Projects</p>
          </div>

          {/* Total Tasks */}
          <div className="flex flex-col items-center justify-center p-6 group cursor-default hover:bg-white/5 rounded-2xl transition-all">
            <div className="relative">
              <div className="text-5xl font-bold text-[#FBF9F5] font-faustina">
                {totalAllTasks}
              </div>
              <div className="absolute -inset-2 bg-[#FBF9F5]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <p className="text-xs text-[#E4DEAA] mt-3 uppercase tracking-wider font-semibold font-faustina">Total Tasks</p>
          </div>

          {/* Completed Projects */}
          <div className="flex flex-col items-center justify-center p-6 group cursor-default hover:bg-white/5 rounded-2xl transition-all">
            <div className="relative">
              <div className="text-5xl font-bold bg-gradient-to-br from-[#80C49B] to-[#80C49B]/80 bg-clip-text text-transparent font-faustina">
                {fullyCompletedProjects}
              </div>
              <div className="absolute -inset-2 bg-[#80C49B]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <p className="text-xs text-[#E4DEAA] mt-3 uppercase tracking-wider font-semibold font-faustina">Completed</p>
          </div>
        </div>
      </div>

      {/* Projects Grid Toggle */}
      <div className="relative mb-6">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-6" />
        
        <button
          onClick={() => setShowProjects((s) => !s)}
          className="group flex items-center gap-3 mx-auto px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#A343EC]/50 transition-all"
        >
          <Folder size={18} className="text-[#A343EC] group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-[#FBF9F5]">
            {showProjects ? "Hide" : "View"} All Projects
          </span>
          <span className="text-xs text-[#E4DEAA] bg-white/5 px-2 py-0.5 rounded-full">
            {totalProjects}
          </span>
          {showProjects ? (
            <ChevronUp size={16} className="text-[#E4DEAA]" />
          ) : (
            <ChevronDown size={16} className="text-[#E4DEAA]" />
          )}
        </button>
      </div>

      {/* Projects Grid */}
      {showProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {projectsWithStats.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                router.push(`/create?action=new_project&projectId=${project.id}`);
                setShowProjects(false);
              }}
              className="group relative p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white/5 to-transparent hover:from-white/10 hover:to-white/5 border border-white/10 hover:border-[#A343EC]/30"
            >
              <div className="flex items-start gap-5">
                {/* Radial Progress - Larger and more prominent */}
                <div className="flex-shrink-0">
                  {project.totalTasks > 0 ? (
                    <div
                      className={`radial-progress ${getProgressColor(project.completionPercentage)} drop-shadow-lg ${getProgressGlow(project.completionPercentage)} transition-all duration-1000 ease-out`}
                      style={{
                        "--value": animateCharts ? project.completionPercentage : 0,
                        "--size": "5.5rem",
                        "--thickness": "5px",
                      } as React.CSSProperties}
                      role="progressbar"
                      aria-valuenow={project.completionPercentage}
                    >
                      <span className="text-base font-bold font-faustina">{project.completionPercentage}%</span>
                    </div>
                  ) : (
                    <div className="w-[5.5rem] h-[5.5rem] rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center transition-all">
                      <AlertCircle size={28} className="text-[#59677C]" />
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold text-[#FBF9F5] mb-2 truncate group-hover:text-[#A343EC] transition-colors font-faustina">
                    {project.title}
                  </h4>
                  
                  {project.description && (
                    <p className="text-sm text-[#E4DEAA]/80 mb-4 line-clamp-2 leading-relaxed font-faustina">
                      {project.description}
                    </p>
                  )}

                  {/* Task Stats */}
                  {project.totalTasks > 0 ? (
                    <div className="flex items-center gap-4 text-xs font-faustina">
                      <div className="flex items-center gap-1.5 text-[#80C49B] bg-[#80C49B]/10 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={14} />
                        <span className="font-semibold">{project.completedTasks}</span>
                        <span className="text-[#80C49B]/60">done</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#F8D45E] bg-[#F8D45E]/10 px-2.5 py-1 rounded-lg">
                        <Clock size={14} />
                        <span className="font-semibold">{project.inProgressTasks}</span>
                        <span className="text-[#F8D45E]/60">active</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#59677C] bg-white/5 px-2.5 py-1 rounded-lg">
                        <AlertCircle size={14} />
                        <span className="font-semibold">{project.pendingTasks}</span>
                        <span className="text-[#59677C]/60">pending</span>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-xs text-[#59677C] bg-white/5 px-3 py-1.5 rounded-lg font-faustina">
                      <AlertCircle size={12} />
                      <span className="italic">No tasks yet</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Minimal Progress Bar */}
              {project.totalTasks > 0 && (
                <div className="mt-5 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      project.completionPercentage === 100
                        ? "bg-gradient-to-r from-[#80C49B] to-[#80C49B]/80"
                        : project.completionPercentage >= 60
                        ? "bg-gradient-to-r from-[#F8D45E] to-[#F8D45E]/80"
                        : project.completionPercentage >= 30
                        ? "bg-gradient-to-r from-orange-400 to-orange-400/80"
                        : "bg-gradient-to-r from-red-400 to-red-400/80"
                    }`}
                    style={{ width: `${project.completionPercentage}%` }}
                  />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}