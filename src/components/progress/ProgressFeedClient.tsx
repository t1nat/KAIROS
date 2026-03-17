"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import Image from "next/image";
import { ArrowLeft, Folder, CheckCircle, Clock, AlertTriangle, CalendarDays, Calendar } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Doughnut, Bar } from "react-chartjs-2";
import { ensureChartJsRegistered } from "~/components/charts/chartjs";
import { useResolvedThemeColors } from "~/components/charts/themeColors";

type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

type ProjectCard = {
  id: number;
  title: string;
  imageUrl?: string | null;
  createdById: string;
  createdByUser?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  tasks: Array<{ id: number; status: TaskStatus }>;
};

type ProjectsQueryResult = {
  data: ProjectCard[] | undefined;
  isLoading: boolean;
  error: { message: string } | null;
};

type OrgActivityEntry = {
  id: number;
  taskId: number;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: Date;
  taskTitle: string;
  projectId: number;
  projectTitle: string;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type OrgActivityResponse = {
  scope: "organization" | "personal";
  rows: OrgActivityEntry[];
};

type OrgActivityQueryResult = {
  data: OrgActivityResponse | undefined;
  isLoading: boolean;
  error: { message: string } | null;
};

type ActivityCategory = "completed" | "created" | "updated" | "deleted" | "status" | "other";

function getCategory(entry: OrgActivityEntry): ActivityCategory {
  if (entry.action === "status_changed" && entry.newValue === "completed") return "completed";
  if (entry.action === "created") return "created";
  if (entry.action === "updated") return "updated";
  if (entry.action === "deleted") return "deleted";
  if (entry.action === "status_changed") return "status";
  return "other";
}

const typedApi = api as unknown as {
  project: {
    getMyProjects: {
      useQuery: (input?: undefined, opts?: { staleTime?: number; enabled?: boolean }) => ProjectsQueryResult;
    };
    getAllProjectsAcrossOrgs: {
      useQuery: (input?: undefined, opts?: { staleTime?: number; enabled?: boolean }) => ProjectsQueryResult;
    };
  };
  task: {
    getOrgActivity: {
      useQuery: (
        input: { limit: number; scope?: string },
        opts?: { staleTime?: number }
      ) => OrgActivityQueryResult;
    };
  };
};

type PieSegment = {
  key: string;
  label: string;
  value: number;
  strokeColor: string;
  projectId?: number;
};

function PieChart(props: {
  segments: PieSegment[];
  title: string;
  subtitle?: string;
  onSegmentClick?: (projectId: number) => void;
}) {
  ensureChartJsRegistered();
  const colors = useResolvedThemeColors();

  const chartSegments = useMemo(
    () => props.segments.filter((s) => s.value > 0),
    [props.segments]
  );

  const data = useMemo(
    () => ({
      labels: chartSegments.map((s) => s.label),
      datasets: [
        {
          data: chartSegments.map((s) => s.value),
          backgroundColor: chartSegments.map((s) => s.strokeColor),
          borderColor: colors.border,
          borderWidth: 1,
          hoverOffset: 8,
        },
      ],
    }),
    [chartSegments, colors.border]
  );

  const options = useMemo(
    () => ({
      cutout: "0%",
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: colors.bgOverlay,
          titleColor: colors.fgPrimary,
          bodyColor: colors.fgPrimary,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          cornerRadius: 8,
        },
      },
      interaction: {
        mode: 'nearest' as const,
        intersect: true,
      },
    }),
    [colors.bgOverlay, colors.fgPrimary, colors.border]
  );

  // Handle click separately to avoid the callback error
  const handleChartClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!props.onSegmentClick) return;
    
    const container = event.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Simple hit detection - find which segment was clicked based on angle
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY);
    
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > radius) return;
    
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    
    const total = chartSegments.reduce((sum, s) => sum + s.value, 0);
    let cumulative = 0;
    
    for (const segment of chartSegments) {
      const segmentAngle = (segment.value / total) * 2 * Math.PI;
      if (angle >= cumulative && angle < cumulative + segmentAngle) {
        if (segment.projectId) {
          props.onSegmentClick(segment.projectId);
        }
        return;
      }
      cumulative += segmentAngle;
    }
  };

  return (
    <div className="flex flex-col p-4 rounded-2xl bg-gradient-to-br from-bg-elevated/80 to-bg-surface/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className="mb-3">
        <p className="text-sm font-semibold text-fg-primary">{props.title}</p>
        {props.subtitle && <p className="text-xs text-fg-tertiary mt-0.5">{props.subtitle}</p>}
      </div>

      <div className="flex items-center gap-5">
        <div 
          className="relative w-28 h-28 flex-shrink-0 drop-shadow-lg group-hover:scale-105 transition-transform duration-300"
          onClick={props.onSegmentClick ? handleChartClick : undefined}
          style={{ cursor: props.onSegmentClick ? 'pointer' : 'default' }}
        >
          <Doughnut data={data} options={options} aria-label={props.title} role="img" />
        </div>

        <div className="flex flex-col gap-2">
          {chartSegments.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-2 text-xs group/item hover:bg-white/5 rounded-md px-2 py-1 transition-colors"
            >
              <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 ring-2 ring-white/10" style={{ backgroundColor: s.strokeColor }} />
              <span className="text-fg-primary font-medium">{s.label}</span>
              <span className="text-fg-tertiary ml-auto tabular-nums">{s.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityBarChart(props: {
  title: string;
  subtitle?: string;
  rows: OrgActivityEntry[];
}) {
  ensureChartJsRegistered();
  const colors = useResolvedThemeColors();

  const data = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; count: number; date: Date }[] = [];

    // Last 7 days (including today) in local time.
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      buckets.push({
        key: d.toISOString().slice(0, 10),
        label,
        count: 0,
        date: d,
      });
    }

    const bucketByKey = new Map(buckets.map((b) => [b.key, b] as const));

    for (const r of props.rows) {
      const d = new Date(r.createdAt);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
      const bucket = bucketByKey.get(key);
      if (bucket) bucket.count += 1;
    }

    return {
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: props.title,
          data: buckets.map((b) => b.count),
          backgroundColor: colors.palette[0] ?? colors.info,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
          maxBarThickness: 28,
        },
      ],
    };
  }, [props.rows, props.title, colors.palette, colors.info, colors.border]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: colors.bgOverlay,
          titleColor: colors.fgPrimary,
          bodyColor: colors.fgPrimary,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.fgPrimary },
        },
        y: {
          beginAtZero: true,
          grid: { color: colors.border },
          ticks: { color: colors.fgPrimary, precision: 0 },
        },
      },
    }),
    [colors.bgOverlay, colors.fgPrimary, colors.border]
  );

  return (
    <div className="flex flex-col p-6 rounded-2xl bg-bg-elevated/70 backdrop-blur-xl border border-white/5 shadow-lg min-h-[200px]">
      <div className="mb-3">
        <p className="text-sm font-semibold text-fg-primary">{props.title}</p>
        {props.subtitle && <p className="text-xs text-fg-tertiary mt-0.5">{props.subtitle}</p>}
      </div>
      <div className="relative h-40 flex-1">
        <Bar data={data} options={options} aria-label={props.title} role="img" />
      </div>
    </div>
  );
}

/* --------------- SVG Progress Ring (matches progress.html) --------------- */
function ProgressRing(props: {
  percent: number;
  completed: number;
  total: number;
  segments: PieSegment[];
}) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, props.percent / 100)));

  return (
    <div className="flex flex-col items-center justify-center py-4 relative">
      <svg className="w-28 h-28" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="60" cy="60" r={radius}
          fill="transparent" stroke="currentColor" strokeWidth="10"
          className="text-border-medium"
        />
        <circle
          cx="60" cy="60" r={radius}
          fill="transparent" stroke="currentColor" strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-accent-primary"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-accent-primary">
          {Math.round(props.percent)}%
        </span>
        <span className="text-[10px] text-fg-tertiary font-medium mt-0.5">
          {props.completed}/{props.total} Tasks
        </span>
      </div>
    </div>
  );
}

function getProjectDisplayName(project: ProjectCard, untitledProjectLabel: string): string {
  return project.title || untitledProjectLabel;
}

function getProjectPhoto(project: ProjectCard): string | null {
  return project.imageUrl ?? project.createdByUser?.image ?? null;
}

function getProjectOwnerLabel(project: ProjectCard): string {
  return project.createdByUser?.name ?? project.createdByUser?.email ?? "";
}

export function ProgressFeedClient() {
  const t = useTranslations("progress");

  const locale = useLocale();
  const colors = useResolvedThemeColors();


  
  // Removed organization/orgs dropdown and related logic

  // Only query for current org's projects and activity
  const { data: orgProjects, isLoading: isLoadingOrgProjects, error: orgProjectsError } =
    typedApi.project.getMyProjects.useQuery(undefined, {
      staleTime: 1000 * 30,
      enabled: true,
    });

  const projects = orgProjects;
  const isLoadingProjects = isLoadingOrgProjects;
  const projectsError = orgProjectsError;

  const { data: activity, isLoading: isLoadingActivity, error: activityError } = typedApi.task.getOrgActivity.useQuery(
    { limit: 200, scope: "organization" },
    { staleTime: 1000 * 15 }
  );

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const errorMessage = projectsError?.message ?? activityError?.message ?? null;

  const selectedProject = (projects ?? []).find((p) => p.id === selectedProjectId) ?? null;

  if (isLoadingProjects || isLoadingActivity) {
    return (
      <div className="p-6">
        <p className="text-sm text-fg-secondary">{t("loading")}</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6">
        <p className="text-sm text-error">{errorMessage}</p>
      </div>
    );
  }

  const scopeLabel = t("scope.organization");

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-6">
          <Folder size={36} className="text-accent-primary" />
        </div>
        <h2 className="text-2xl font-bold text-fg-primary mb-2">No projects yet</h2>
        <p className="text-fg-secondary mb-6">Create your first project to start tracking progress.</p>
        <a
          href="/projects"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent-primary text-white font-semibold rounded-xl hover:bg-accent-hover hover:shadow-lg hover:shadow-accent-primary/25 transition-all hover:scale-[1.02]"
        >
          Create one now!
        </a>
      </div>
    );
  }

  const activityRows = activity?.rows ?? [];

  if (!selectedProject) {
    const allTasks = projects.flatMap((p) => p.tasks ?? []);
    const totalTasksAll = allTasks.length;
    const completedTasksAll = allTasks.filter((t) => t.status === "completed").length;
    const overallPercent = totalTasksAll > 0 ? (completedTasksAll / totalTasksAll) * 100 : 0;

    const projectsSorted = [...projects].sort((a, b) => (b.tasks?.length ?? 0) - (a.tasks?.length ?? 0));

    const completedByProjectSegments: PieSegment[] = [];
    let completedTotalFromSegments = 0;
    let paletteIndex = 0;
    for (const project of projectsSorted) {
      const projectCompleted = (project.tasks ?? []).filter((t) => t.status === "completed").length;
      if (projectCompleted <= 0) continue;

      completedTotalFromSegments += projectCompleted;
      completedByProjectSegments.push({
        key: String(project.id),
        label: getProjectDisplayName(project, t("project.untitled")),
        value: projectCompleted,
        strokeColor: colors.palette[paletteIndex % colors.palette.length] ?? colors.other,
      });
      paletteIndex += 1;
    }

    const remainingAll = Math.max(0, totalTasksAll - completedTotalFromSegments);
    const overallSegments: PieSegment[] = [
      ...completedByProjectSegments,
      { key: "remaining", label: t("labels.remaining"), value: remainingAll, strokeColor: colors.remaining },
    ];




    const completionRows = activityRows.filter(
      (r) => r.action === "status_changed" && r.newValue === "completed"
    );

    // New/different data: track created tasks separately and show activity trend.
    const createdRows = activityRows.filter((r) => r.action === "created");

    const rowsForContributorShare = completionRows.length > 0 ? completionRows : activityRows;

    const globalContributorCounts = new Map<string, number>();
    for (const entry of rowsForContributorShare) {
      const displayName = entry.user?.name ?? entry.user?.email ?? t("user.someone");
      globalContributorCounts.set(
        displayName,
        (globalContributorCounts.get(displayName) ?? 0) + 1
      );
    }
    const globalSorted = Array.from(globalContributorCounts.entries()).sort((a, b) => b[1] - a[1]);


    // Task Status Distribution
    const statusCounts = {
      pending: allTasks.filter((t) => t.status === "pending").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      blocked: allTasks.filter((t) => t.status === "blocked").length,
    };



    // Due Dates Tracking
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Type assertion for tasks with dueDate
    type TaskWithDueDate = typeof allTasks[number] & { dueDate?: Date | null };
    const tasksTyped = allTasks as TaskWithDueDate[];
    
    const tasksWithDueDates = tasksTyped.filter((t) => t.dueDate && t.status !== "completed");
    const overdueTasks = tasksWithDueDates.filter((t) => t.dueDate && new Date(t.dueDate) < today).length;
    const dueTodayTasks = tasksWithDueDates.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due.toDateString() === today.toDateString();
    }).length;
    const dueThisWeekTasks = tasksWithDueDates.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return due > today && due <= endOfWeek;
    }).length;

    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight text-fg-primary">{t("title")}</h2>
        </div>

        {/* Row 1: Project Analytics + Contributor Share / Created vs Completed */}
        <div className="grid grid-cols-12 gap-4">
          {/* Project Analytics - large glass card */}
          <div className="col-span-12 lg:col-span-7 bg-bg-elevated/70 backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-lg shadow-accent-primary/[0.08]">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-fg-primary">{t("overall.title")}</h3>
              <p className="text-xs text-fg-tertiary">{t("overall.subtitle")}</p>
            </div>

            <ProgressRing
              percent={overallPercent}
              completed={completedTasksAll}
              total={totalTasksAll}
              segments={overallSegments}
            />

            {/* Legend below ring */}
            <div className="flex justify-center gap-4 mt-4 flex-wrap">
              {completedByProjectSegments.slice(0, 4).map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.strokeColor }} />
                  <span className="text-sm text-fg-primary">
                    {seg.label} <span className="text-fg-tertiary ml-1">{seg.value}</span>
                  </span>
                </div>
              ))}
              {remainingAll > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-border-medium" />
                  <span className="text-sm text-fg-primary">
                    {t("labels.remaining")} <span className="text-fg-tertiary ml-1">{remainingAll}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Contributor Share + Created vs Completed */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
            {/* Contributor Share */}
            <div className="bg-bg-elevated/70 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex-1">
              <div className="mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">{t("contributors.title")}</h3>
                <p className="text-xs text-fg-tertiary/70">{t("contributors.subtitle")}</p>
              </div>
              <div className="space-y-2">
                {globalSorted.slice(0, 3).map(([name, count], idx) => {
                  const maxVal = globalSorted[0]?.[1] ?? 1;
                  const barPercent = Math.round((count / maxVal) * 100);
                  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <div key={name} className="flex items-center gap-2 p-2 rounded-lg bg-accent-primary/5 border border-accent-primary/10">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: colors.palette[idx % colors.palette.length] }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-fg-primary truncate">{name}</p>
                        <div className="w-full bg-border-medium h-1 rounded-full mt-1 overflow-hidden">
                          <div className="bg-accent-primary h-full rounded-full transition-all" style={{ width: `${barPercent}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-accent-primary">{count}</span>
                    </div>
                  );
                })}
                {globalSorted.length === 0 && (
                  <p className="text-sm text-fg-tertiary text-center py-4">No activity yet</p>
                )}
              </div>
            </div>

            {/* Created vs Completed */}
            <div className="bg-bg-elevated/70 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex-1">
              <div className="mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">{t("createdVsCompleted.title")}</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-fg-secondary">{t("labels.created")}</span>
                  </div>
                  <span className="text-xs font-bold text-fg-primary">{createdRows.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent-primary" />
                    <span className="text-xs text-fg-secondary">{t("labels.completed")}</span>
                  </div>
                  <span className="text-xs font-bold text-accent-primary">{completionRows.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Task Status Distribution + Upcoming Due Dates */}
        <div className="grid grid-cols-12 gap-4">
          {/* Task Status Distribution */}
          <div className="col-span-12 lg:col-span-4 bg-bg-elevated/70 backdrop-blur-xl border border-white/5 p-4 rounded-2xl">
            <h3 className="text-xs font-semibold text-fg-primary mb-3">Task Status Distribution</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-xs font-medium text-fg-primary">Completed</span>
                </div>
                <span className="text-xs font-bold text-fg-primary">{statusCounts.completed}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-orange-500" />
                  <span className="text-xs font-medium text-fg-primary">Pending</span>
                </div>
                <span className="text-xs font-bold text-fg-primary">{statusCounts.pending}</span>
              </div>
              {statusCounts.in_progress > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-blue-500" />
                    <span className="text-xs font-medium text-fg-primary">In Progress</span>
                  </div>
                  <span className="text-xs font-bold text-fg-primary">{statusCounts.in_progress}</span>
                </div>
              )}
              {statusCounts.blocked > 0 && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <span className="text-xs font-medium text-fg-primary">Blocked</span>
                  </div>
                  <span className="text-xs font-bold text-fg-primary">{statusCounts.blocked}</span>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Due Dates */}
          <div className="col-span-12 lg:col-span-8 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-tertiary">Upcoming Due Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 group hover:bg-red-500/15 transition-all">
                <div className="flex items-center gap-1.5 text-red-500 mb-1">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-red-500">{overdueTasks}</p>
                <p className="text-[10px] text-fg-tertiary">Tasks past due date</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 group hover:bg-orange-500/15 transition-all">
                <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                  <CalendarDays size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Due Today</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">{dueTodayTasks}</p>
                <p className="text-[10px] text-fg-tertiary">Tasks due today</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 group hover:bg-blue-500/15 transition-all">
                <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                  <Calendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">This Week</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">{dueThisWeekTasks}</p>
                <p className="text-[10px] text-fg-tertiary">Tasks due within 7 days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Activity Trend + Per-project share */}
        <div className="grid grid-cols-12 gap-4">
          {/* Activity Trend */}
          <div className="col-span-12 lg:col-span-8">
            <ActivityBarChart
              title={t("activityTrend.title")}
              subtitle={t("activityTrend.subtitle")}
              rows={activityRows}
            />
          </div>

          {/* Per-project share */}
          <div className="col-span-12 lg:col-span-4 bg-bg-elevated/70 backdrop-blur-xl border border-white/5 p-4 rounded-2xl">
            <h3 className="text-xs font-semibold text-fg-primary mb-3">{t("perProject.title")}</h3>
            <div className="space-y-2">
              {projectsSorted.slice(0, 6).map((project, idx) => {
                const title = getProjectDisplayName(project, t("project.untitled"));
                const projectCompleted = (project.tasks ?? []).filter(tk => tk.status === "completed").length;
                const projectTotal = project.tasks?.length ?? 0;
                const barPct = projectTotal > 0 ? Math.round((projectCompleted / projectTotal) * 100) : 0;
                return (
                  <div key={project.id}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: colors.palette[idx % colors.palette.length] }}
                        />
                        <span className="text-xs font-medium text-fg-primary">{title}</span>
                      </div>
                      <span className="text-xs font-bold text-fg-primary">{projectCompleted}/{projectTotal}</span>
                    </div>
                    <div className="w-full bg-border-medium h-2 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor: colors.palette[idx % colors.palette.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div>
          <p className="text-sm font-medium text-fg-primary mb-3">{t("projectsList.title")}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {projects.map((project) => {
              const title = getProjectDisplayName(project, t("project.untitled"));
              const photo = getProjectPhoto(project);
              const ownerLabel = getProjectOwnerLabel(project);

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className="text-left p-3 rounded-lg border border-white/[0.06] shadow-sm hover:shadow-md hover:bg-bg-elevated/30 hover:border-accent-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-bg-secondary/50 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {photo ? (
                        <Image
                          src={photo}
                          alt={title}
                          width={32}
                          height={32}
                          className="w-8 h-8 object-cover"
                        />
                      ) : (
                        <Folder className="text-fg-tertiary" size={14} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-fg-primary truncate">{title}</p>
                      {ownerLabel && <p className="text-[10px] text-fg-tertiary truncate">{ownerLabel}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const projectTitle = getProjectDisplayName(selectedProject, t("project.untitled"));
  const projectPhoto = getProjectPhoto(selectedProject);

  const projectTasks = selectedProject.tasks ?? [];
  const completedTasks = projectTasks.filter((t) => t.status === "completed").length;
  const totalTasks = projectTasks.length;
  const remainingTasks = Math.max(0, totalTasks - completedTasks);

  const projectActivity = activityRows.filter((r) => r.projectId === selectedProject.id);
  const lastActivityAt = projectActivity.length > 0 ? projectActivity[0]?.createdAt : null;

  const categoryCounts: Record<ActivityCategory, number> = {
    completed: 0,
    created: 0,
    updated: 0,
    deleted: 0,
    status: 0,
    other: 0,
  };

  const completionRows = projectActivity.filter(
    (r) => r.action === "status_changed" && r.newValue === "completed"
  );
  const rowsForContributorShare = completionRows.length > 0 ? completionRows : projectActivity;

  const contributorCounts = new Map<string, number>();

  for (const entry of rowsForContributorShare) {
    const category = getCategory(entry);
    categoryCounts[category] += 1;

    const displayName = entry.user?.name ?? entry.user?.email ?? t("user.someone");
    contributorCounts.set(displayName, (contributorCounts.get(displayName) ?? 0) + 1);
  }

  const contributorsSorted = Array.from(contributorCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topContributors = contributorsSorted.slice(0, 5);
  const otherContribTotal = contributorsSorted.slice(5).reduce((s, [, v]) => s + v, 0);

  const completionSegments: PieSegment[] = [
    { key: "done", label: t("labels.done"), value: completedTasks, strokeColor: colors.completed },
    { key: "remaining", label: t("labels.remaining"), value: remainingTasks, strokeColor: colors.remaining },
  ];

  const activitySegments: PieSegment[] = [
    { key: "completed", label: t("labels.completed"), value: categoryCounts.completed, strokeColor: colors.completed },
    { key: "created", label: t("labels.created"), value: categoryCounts.created, strokeColor: colors.palette[0] ?? colors.other },
    { key: "updated", label: t("labels.updated"), value: categoryCounts.updated, strokeColor: colors.warning },
    { key: "status", label: t("labels.status"), value: categoryCounts.status, strokeColor: colors.info },
    { key: "deleted", label: t("labels.deleted"), value: categoryCounts.deleted, strokeColor: colors.error },
    { key: "other", label: t("labels.other"), value: categoryCounts.other, strokeColor: colors.other },
  ];

  const contributorSegments: PieSegment[] = [
    ...topContributors.map(([name, value], idx) => ({
      key: name,
      label: name,
      value,
      strokeColor: colors.palette[idx % colors.palette.length] ?? colors.other,
    })),
    ...(otherContribTotal > 0
      ? [{ key: "other", label: t("labels.other"), value: otherContribTotal, strokeColor: colors.other }]
      : []),
  ];

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => setSelectedProjectId(null)}
          className="p-2 rounded-lg hover:bg-bg-elevated/50 transition-colors"
            aria-label={t("projectDetails.back")}
        >
          <ArrowLeft size={18} className="text-fg-secondary" />
        </button>

        <div className="w-9 h-9 rounded-lg bg-bg-secondary/50 overflow-hidden flex items-center justify-center flex-shrink-0">
          {projectPhoto ? (
            <Image
              src={projectPhoto}
              alt={projectTitle}
              width={36}
              height={36}
              className="w-9 h-9 object-cover"
            />
          ) : (
            <Folder className="text-fg-tertiary" size={16} />
          )}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-fg-primary truncate">{projectTitle}</h2>
          <p className="text-xs text-fg-tertiary">{scopeLabel}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="surface-card p-3 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide mb-1">{t("stats.tasks")}</p>
          <p className="text-2xl font-bold text-fg-primary">{totalTasks}</p>
        </div>
        <div className="surface-card p-3 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide mb-1">{t("stats.completed")}</p>
          <p className="text-2xl font-bold text-success">{completedTasks}</p>
        </div>
        <div className="surface-card p-3 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide mb-1">{t("labels.activity")}</p>
          <p className="text-2xl font-bold text-accent-primary">{projectActivity.length}</p>
        </div>
        <div className="surface-card p-3 hover:shadow-md transition-shadow">
          <p className="text-xs font-medium text-fg-tertiary uppercase tracking-wide mb-1">{t("projectDetails.lastUpdate")}</p>
          <p className="text-sm font-semibold text-fg-primary">
            {lastActivityAt
              ? new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(new Date(lastActivityAt))
              : "—"}
          </p>
        </div>
      </div>

      {/* Chart Cards */}
      <div className="space-y-4">
        <div className="surface-card p-4">
          <PieChart title={t("projectDetails.taskCompletion")} segments={completionSegments} />
        </div>
        <div className="surface-card p-4">
          <PieChart title={t("projectDetails.activityCategories")} segments={activitySegments} />
        </div>
        <div className="surface-card p-4">
          <PieChart title={t("contributors.title")} subtitle={t("contributors.subtitle")} segments={contributorSegments} />
        </div>
      </div>
    </div>
  );
}