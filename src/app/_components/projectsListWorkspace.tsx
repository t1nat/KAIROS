"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Folder, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
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
  useState(() => {
    const timer = setTimeout(() => setAnimateCharts(true), 100);
    return () => clearTimeout(timer);
  });

  const { data: projects, isLoading } = api.project.getMyProjects.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading || !projects || projects.length === 0) {
    return null;
  }

  const projectsWithStats: ProjectWithStats[] = projects.map((project) => {
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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3 sm:gap-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#FBF9F5] mb-1 sm:mb-2 flex items-center gap-2 sm:gap-3">
              Project Analytics
            </h3>
            <p className="text-xs sm:text-sm text-[#E4DEAA]">Real-time progress across all your projects</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="col-span-2 sm:col-span-1 lg:col-span-1 flex flex-col items-center justify-center p-4 sm:p-6 group cursor-default">
            <div
              className={`radial-progress ${getProgressColor(overallCompletion)} drop-shadow-2xl ${getProgressGlow(overallCompletion)} transition-all duration-[2000ms] ease-out`}
              style={{
                "--value": animateCharts ? overallCompletion : 0, 
                "--size": "6rem",
                "--thickness": "4px",
              } as React.CSSProperties}
              role="progressbar"
              aria-valuenow={overallCompletion}
            >
              <span className="text-xl sm:text-2xl font-bold font-faustina">{overallCompletion}%</span>
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <p className="text-[10px] sm:text-xs text-[#E4DEAA] uppercase tracking-wider font-semibold font-faustina">Overall Progress</p>
              <p className="text-[9px] sm:text-[10px] text-[#59677C] mt-1 font-faustina">{totalCompletedTasks} of {totalAllTasks} tasks</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-4 sm:p-6 group cursor-default hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all">
            <div className="relative">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-[#A343EC] to-[#9448F2] bg-clip-text text-transparent font-faustina">
                {totalProjects}
              </div>
              <div className="absolute -inset-2 bg-gradient-to-br from-[#A343EC]/20 to-[#9448F2]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <p className="text-[10px] sm:text-xs text-[#E4DEAA] mt-2 sm:mt-3 uppercase tracking-wider font-semibold font-faustina text-center">Active Projects</p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 sm:p-6 group cursor-default hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all">
            <div className="relative">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#FBF9F5] font-faustina">
                {totalAllTasks}
              </div>
              <div className="absolute -inset-2 bg-[#FBF9F5]/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <p className="text-[10px] sm:text-xs text-[#E4DEAA] mt-2 sm:mt-3 uppercase tracking-wider font-semibold font-faustina text-center">Total Tasks</p>
          </div>

          <div className="flex flex-col items-center justify-center p-4 sm:p-6 group cursor-default hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all">
            <div className="relative">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-[#80C49B] to-[#80C49B]/80 bg-clip-text text-transparent font-faustina">
                {fullyCompletedProjects}
              </div>
              <div className="absolute -inset-2 bg-[#80C49B]/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
            <p className="text-[10px] sm:text-xs text-[#E4DEAA] mt-2 sm:mt-3 uppercase tracking-wider font-semibold font-faustina text-center">Completed</p>
          </div>
        </div>
      </div>

      <div className="relative mb-4 sm:mb-6">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4 sm:mb-6" />
        
        <button
          onClick={() => setShowProjects((s) => !s)}
          className="group flex items-center gap-2 sm:gap-3 mx-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#A343EC]/50 transition-all"
        >
          <Folder size={16} className="text-[#A343EC] group-hover:scale-110 transition-transform sm:w-[18px] sm:h-[18px]" />
          <span className="text-xs sm:text-sm font-semibold text-[#FBF9F5]">
            {showProjects ? "Hide" : "View"} All Projects
          </span>
          <span className="text-[10px] sm:text-xs text-[#E4DEAA] bg-white/5 px-1.5 sm:px-2 py-0.5 rounded-full">
            {totalProjects}
          </span>
          {showProjects ? (
            <ChevronUp size={14} className="text-[#E4DEAA] sm:w-4 sm:h-4" />
          ) : (
            <ChevronDown size={14} className="text-[#E4DEAA] sm:w-4 sm:h-4" />
          )}
        </button>
      </div>

      {showProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {projectsWithStats.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                router.push(`/create?action=new_project&projectId=${project.id}`);
                setShowProjects(false);
              }}
              className="group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] bg-gradient-to-br from-white/5 to-transparent hover:from-white/10 hover:to-white/5 border border-white/10 hover:border-[#A343EC]/30"
            >
              <div className="flex items-start gap-3 sm:gap-5">
                <div className="flex-shrink-0">
                  {project.totalTasks > 0 ? (
                    <div
                      className={`radial-progress ${getProgressColor(project.completionPercentage)} drop-shadow-lg ${getProgressGlow(project.completionPercentage)} transition-all duration-1000 ease-out`}
                      style={{
                        "--value": animateCharts ? project.completionPercentage : 0,
                        "--size": "4.5rem",
                        "--thickness": "4px",
                      } as React.CSSProperties}
                      role="progressbar"
                      aria-valuenow={project.completionPercentage}
                    >
                      <span className="text-sm sm:text-base font-bold font-faustina">{project.completionPercentage}%</span>
                    </div>
                  ) : (
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center transition-all">
                      <AlertCircle size={24} className="text-[#59677C] sm:w-7 sm:h-7" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-[#FBF9F5] mb-1.5 sm:mb-2 truncate group-hover:text-[#A343EC] transition-colors font-faustina">
                    {project.title}
                  </h4>
                  
                  {project.description && (
                    <p className="text-xs sm:text-sm text-[#E4DEAA]/80 mb-3 sm:mb-4 line-clamp-2 leading-relaxed font-faustina">
                      {project.description}
                    </p>
                  )}

                  {project.totalTasks > 0 ? (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-faustina">
                      <div className="flex items-center gap-1 sm:gap-1.5 text-[#80C49B] bg-[#80C49B]/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                        <CheckCircle2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="font-semibold">{project.completedTasks}</span>
                        <span className="text-[#80C49B]/60 hidden xs:inline">done</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 text-[#F8D45E] bg-[#F8D45E]/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                        <Clock size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="font-semibold">{project.inProgressTasks}</span>
                        <span className="text-[#F8D45E]/60 hidden xs:inline">active</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-1.5 text-[#59677C] bg-white/5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                        <AlertCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span className="font-semibold">{project.pendingTasks}</span>
                        <span className="text-[#59677C]/60 hidden xs:inline">pending</span>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-[#59677C] bg-white/5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-faustina">
                      <AlertCircle size={10} className="sm:w-3 sm:h-3" />
                      <span className="italic">No tasks yet</span>
                    </div>
                  )}
                </div>
              </div>

              {project.totalTasks > 0 && (
                <div className="mt-4 sm:mt-5 w-full h-0.5 sm:h-1 bg-white/5 rounded-full overflow-hidden">
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