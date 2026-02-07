"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Folder, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Doughnut } from "react-chartjs-2";
import { ensureChartJsRegistered } from "~/components/charts/chartjs";
import { useResolvedThemeColors } from "~/components/charts/theme-colors";

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

function toFiniteNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const item of value as unknown[]) {
    if (typeof item === "number" && Number.isFinite(item)) out.push(item);
  }
  return out;
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
  const [mounted, setMounted] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(false);
  const router = useRouter();
  
  ensureChartJsRegistered();
  const colors = useResolvedThemeColors();

  const t = useTranslations("create");

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setAnimateCharts(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data: projects, isLoading } = api.project.getMyProjects.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  if (!mounted) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8 sm:mb-12">
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded-[12px] mb-4"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <div className="h-32 bg-bg-tertiary rounded-[12px]"></div>
              <div className="h-32 bg-bg-tertiary rounded-[12px]"></div>
              <div className="h-32 bg-bg-tertiary rounded-[12px]"></div>
              <div className="h-32 bg-bg-tertiary rounded-[12px]"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
  const totalInProgressTasks = projectsWithStats.reduce((sum, p) => sum + p.inProgressTasks, 0);
  const totalPendingTasks = projectsWithStats.reduce((sum, p) => sum + p.pendingTasks, 0);
  const overallCompletion = totalAllTasks > 0 ? Math.round((totalCompletedTasks / totalAllTasks) * 100) : 0;
  const fullyCompletedProjects = projectsWithStats.filter((p) => p.completionPercentage === 100 && p.totalTasks > 0).length;

  const getProgressColor = (percentage: number): string => {
    if (percentage === 0) return "text-fg-tertiary";
    if (percentage < 30) return "text-error";
    if (percentage < 60) return "text-warning";
    if (percentage < 100) return "text-accent-primary";
    return "text-success";
  };

  const getProgressGlow = (percentage: number): string => {
    if (percentage === 0) return "shadow-transparent";
    if (percentage < 30) return "shadow-error/20";
    if (percentage < 60) return "shadow-warning/20";
    if (percentage < 100) return "shadow-accent-primary/20";
    return "shadow-success/30";
  };

  const buildRingData = (completed: number, inProgress: number, pending: number) => {
    const done = animateCharts ? completed : 0;
    const active = animateCharts ? inProgress : 0;
    const waiting = Math.max(0, pending);
    return {
      labels: [t("stats.completed"), t("projectsList.active"), t("projectsList.pending")],
      datasets: [
        {
          data: [done, active, waiting],
          backgroundColor: [colors.success, colors.warning, colors.remaining],
          borderColor: colors.border,
          borderWidth: 1,
        },
      ],
    };
  };

  const ringOptions = {
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: colors.bgOverlay,
        titleColor: colors.fgPrimary,
        bodyColor: colors.fgPrimary,
        callbacks: {
          label: (ctx: { label?: string; parsed?: number; dataset?: { data?: unknown } }) => {
            const label = ctx.label ?? "";
            const value = typeof ctx.parsed === "number" ? ctx.parsed : 0;
            const data = toFiniteNumberArray(ctx.dataset?.data);
            const total = data.reduce((s, v) => s + v, 0);
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="pt-8 pb-6">
        <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.022em] kairos-fg-primary kairos-font-display mb-2">
          Project Analytics
        </h1>
        <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] kairos-fg-tertiary kairos-font-body">
          {t("projectsList.subtitle")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-8">
        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="kairos-bg-surface rounded-[10px] p-4 sm:p-6 flex flex-col items-center justify-center kairos-section-border">
            <div className={`relative w-24 h-24 sm:w-28 sm:h-28 drop-shadow-2xl ${getProgressGlow(overallCompletion)}`}>
              <Doughnut
                data={buildRingData(totalCompletedTasks, totalInProgressTasks, totalPendingTasks)}
                options={ringOptions}
                aria-label={t("projectsList.overallProgress")}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl sm:text-2xl font-bold ${getProgressColor(overallCompletion)}`}>
                  {overallCompletion}%
                </span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 text-center">
              <p className="text-[10px] sm:text-xs text-fg-tertiary uppercase tracking-wider font-semibold">
                {t("projectsList.overallProgress")}
              </p>
              <p className="text-[9px] sm:text-[10px] text-fg-tertiary mt-1">
                {t("projectsList.tasksOfTasks", { completed: totalCompletedTasks, total: totalAllTasks })}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="kairos-bg-surface rounded-[10px] p-4 sm:p-6 flex flex-col items-center justify-center kairos-section-border hover:kairos-active-state transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent">
              {totalProjects}
            </div>
            <p className="text-[10px] sm:text-xs text-fg-tertiary mt-2 sm:mt-3 uppercase tracking-wider font-semibold text-center">
              {t("projectsList.activeProjects")}
            </p>
          </div>
        </div>

        <div>
          <div className="kairos-bg-surface rounded-[10px] p-4 sm:p-6 flex flex-col items-center justify-center kairos-section-border hover:kairos-active-state transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-fg-primary">
              {totalAllTasks}
            </div>
            <p className="text-[10px] sm:text-xs text-fg-tertiary mt-2 sm:mt-3 uppercase tracking-wider font-semibold text-center">
              {t("stats.totalTasks")}
            </p>
          </div>
        </div>

        <div>
          <div className="kairos-bg-surface rounded-[10px] p-4 sm:p-6 flex flex-col items-center justify-center kairos-section-border hover:kairos-active-state transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-success to-success/80 bg-clip-text text-transparent">
              {fullyCompletedProjects}
            </div>
            <p className="text-[10px] sm:text-xs text-fg-tertiary mt-2 sm:mt-3 uppercase tracking-wider font-semibold text-center">
              {t("stats.completed")}
            </p>
          </div>
        </div>
      </div>

      {/* Projects Toggle */}
      <div className="relative mb-6">
        <div className="h-[0.33px] kairos-divider mb-4" />
        
        <button
          onClick={() => setShowProjects((s) => !s)}
          className="w-full flex items-center justify-between pl-4 pr-[18px] py-[11px] kairos-bg-surface rounded-[10px] kairos-section-border active:kairos-active-state transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-[30px] h-[30px] rounded-full kairos-bg-tertiary flex items-center justify-center">
              <Folder size={18} className="kairos-fg-secondary" strokeWidth={2.2} />
            </div>
            <span className="text-[17px] leading-[1.235] tracking-[-0.016em] kairos-fg-primary kairos-font-body">
              {showProjects ? t("projectsList.hideAll") : t("projectsList.viewAll")}
            </span>
            <span className="text-[13px] text-fg-tertiary bg-bg-tertiary/50 px-2 py-0.5 rounded-full">
              {totalProjects}
            </span>
          </div>
          {showProjects ? (
            <ChevronUp size={20} className="kairos-fg-tertiary" strokeWidth={2.5} />
          ) : (
            <ChevronDown size={20} className="kairos-fg-tertiary" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Projects Grid */}
      {showProjects && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {projectsWithStats.map((project) => (
            <button
              key={project.id}
              onClick={() => {
                router.push(`/create?action=new_project&projectId=${project.id}`);
                setShowProjects(false);
              }}
              className="w-full text-left kairos-bg-surface rounded-[10px] p-4 sm:p-6 kairos-section-border active:kairos-active-state transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {project.totalTasks > 0 ? (
                    <div className={`relative w-20 h-20 drop-shadow-lg ${getProgressGlow(project.completionPercentage)}`}>
                      <Doughnut
                        data={buildRingData(project.completedTasks, project.inProgressTasks, project.pendingTasks)}
                        options={ringOptions}
                        aria-label={project.title}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm font-bold ${getProgressColor(project.completionPercentage)}`}>
                          {project.completionPercentage}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full kairos-bg-tertiary border border-border-light/30 flex items-center justify-center">
                      <AlertCircle size={24} className="kairos-fg-tertiary" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-[17px] leading-[1.235] tracking-[-0.016em] kairos-fg-primary kairos-font-body font-[590] mb-1">
                    {project.title}
                  </h4>
                  
                  {project.description && (
                    <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] kairos-fg-secondary kairos-font-body mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {project.totalTasks > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 text-success bg-success/10 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 size={14} />
                        <span className="text-[13px] font-semibold">{project.completedTasks}</span>
                        <span className="text-[13px] text-success/70 hidden xs:inline">
                          {t("projectsList.done")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-warning bg-warning/10 px-2.5 py-1 rounded-lg">
                        <Clock size={14} />
                        <span className="text-[13px] font-semibold">{project.inProgressTasks}</span>
                        <span className="text-[13px] text-warning/70 hidden xs:inline">
                          {t("projectsList.active")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-fg-tertiary bg-bg-tertiary/30 px-2.5 py-1 rounded-lg">
                        <AlertCircle size={14} />
                        <span className="text-[13px] font-semibold">{project.pendingTasks}</span>
                        <span className="text-[13px] text-fg-tertiary hidden xs:inline">
                          {t("projectsList.pending")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 text-[13px] text-fg-tertiary bg-bg-tertiary/30 px-3 py-1.5 rounded-lg">
                      <AlertCircle size={12} />
                      <span className="italic">{t("projectsList.noTasksYet")}</span>
                    </div>
                  )}
                </div>
              </div>

              {project.totalTasks > 0 && (
                <div className="mt-4 w-full h-0.5 bg-bg-tertiary/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      project.completionPercentage === 100
                        ? "bg-gradient-to-r from-success to-success/80"
                        : project.completionPercentage >= 60
                        ? "bg-gradient-to-r from-warning to-warning/80"
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

      {/* Bottom Spacing */}
      <div className="h-8"></div>
    </div>
  );
}