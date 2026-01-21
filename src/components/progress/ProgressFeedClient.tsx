"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Image from "next/image";
import { ArrowLeft, Folder, ChevronDown, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Doughnut, Bar } from "react-chartjs-2";
import { ensureChartJsRegistered } from "~/components/charts/chartjs";
import { useResolvedThemeColors } from "~/components/charts/theme-colors";

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

function LargePieChart(props: {
  title: string;
  subtitle: string;
  percent: number;
  completed: number;
  total: number;
  segments: PieSegment[];
}) {
  ensureChartJsRegistered();
  const colors = useResolvedThemeColors();

  const chartSegments = useMemo(
    () => props.segments.filter((s) => s.value > 0),
    [props.segments]
  );
  const clampedPercent = Math.max(0, Math.min(100, props.percent));

  const data = useMemo(
    () => ({
      labels: chartSegments.map((s) => s.label),
      datasets: [
        {
          data: chartSegments.map((s) => s.value),
          backgroundColor: chartSegments.map((s) => s.strokeColor),
          borderColor: colors.border,
          borderWidth: 1,
          hoverOffset: 12,
        },
      ],
    }),
    [chartSegments, colors.border]
  );

  const options = useMemo(
    () => ({
      cutout: "60%",
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: colors.bgOverlay,
          titleColor: colors.fgPrimary,
          bodyColor: colors.fgPrimary,
          borderColor: colors.border,
          borderWidth: 1,
          padding: 16,
          displayColors: true,
          boxWidth: 14,
          boxHeight: 14,
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

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-bg-elevated/80 to-bg-surface/40 backdrop-blur-sm shadow-lg">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-fg-primary">{props.title}</h3>
        <p className="text-xs text-fg-tertiary mt-1">{props.subtitle}</p>
      </div>

      <div className="relative w-48 h-48 drop-shadow-xl">
        <Doughnut data={data} options={options} aria-label={props.title} />
        {/* Center overlay with percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent">
            {Math.round(clampedPercent)}%
          </p>
          <p className="text-xs text-fg-tertiary font-medium">{props.completed}/{props.total}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {chartSegments.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 rounded-full px-3 py-1.5 transition-colors"
          >
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 ring-2 ring-white/10" style={{ backgroundColor: s.strokeColor }} />
            <span className="text-fg-primary font-medium">{s.label}</span>
            <span className="text-fg-tertiary tabular-nums">{s.value}</span>
          </span>
        ))}
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
    <div className="flex flex-col p-4 rounded-2xl bg-gradient-to-br from-bg-elevated/80 to-bg-surface/40 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
      <div className="mb-3">
        <p className="text-sm font-semibold text-fg-primary">{props.title}</p>
        {props.subtitle && <p className="text-xs text-fg-tertiary mt-0.5">{props.subtitle}</p>}
      </div>
      <div className="relative h-40">
        <Bar data={data} options={options} aria-label={props.title} role="img" />
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
  const tOrg = useTranslations("org");
  const locale = useLocale();
  const colors = useResolvedThemeColors();
  const router = useRouter();

  const utils = api.useUtils();
  
  // View mode: "all" = all organizations, "org" = specific organization
  const [viewMode, setViewMode] = useState<"all" | "org">("org");
  
  // Organization queries
  const activeOrgQuery = api.organization.getActive.useQuery();
  const orgsQuery = api.organization.listMine.useQuery();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  
  const activeOrgId = activeOrgQuery.data?.organization?.id ?? null;
  const activeName = activeOrgQuery.data?.organization?.name ?? null;
  const orgs = orgsQuery.data ?? [];

  const setActiveOrg = api.organization.setActive.useMutation({
    onMutate: async ({ organizationId }) => {
      // Optimistic update - cancel any outgoing queries
      await utils.organization.getActive.cancel();
      
      // Snapshot the previous value
      const previousOrg = utils.organization.getActive.getData();
      
      // Find the org we're switching to
      const newOrg = orgs.find(o => o.id === organizationId);
      
      // Optimistically update the active org
      if (newOrg) {
        utils.organization.getActive.setData(undefined, {
          organization: {
            id: newOrg.id,
            name: newOrg.name,
            accessCode: newOrg.accessCode,
          },
          role: newOrg.role,
        });
      }
      
      setOrgDropdownOpen(false);
      setViewMode("org");
      
      return { previousOrg };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousOrg) {
        utils.organization.getActive.setData(undefined, context.previousOrg);
      }
    },
    onSettled: () => {
      // Always refetch after mutation settles
      void utils.organization.getActive.invalidate();
      void utils.project.invalidate();
      void utils.task.invalidate();
    },
  });

  const handleOrgPick = useCallback(
    (organizationId: number | "all") => {
      if (organizationId === "all") {
        setViewMode("all");
        setOrgDropdownOpen(false);
        return;
      }
      if (setActiveOrg.isPending) return;
      setActiveOrg.mutate({ organizationId });
    },
    [setActiveOrg],
  );

  // Query for current org's projects
  const { data: orgProjects, isLoading: isLoadingOrgProjects, error: orgProjectsError } =
    typedApi.project.getMyProjects.useQuery(undefined, {
      staleTime: 1000 * 30,
      enabled: viewMode === "org",
    });

  // Query for all projects across orgs (only when viewing all)
  const { data: allOrgProjects, isLoading: isLoadingAllProjects, error: allProjectsError } =
    typedApi.project.getAllProjectsAcrossOrgs.useQuery(undefined, {
      staleTime: 1000 * 60, // Cache longer since it's more expensive
      enabled: viewMode === "all",
    });

  // Use the appropriate projects based on view mode
  const projects = viewMode === "all" ? allOrgProjects : orgProjects;
  const isLoadingProjects = viewMode === "all" ? isLoadingAllProjects : isLoadingOrgProjects;
  const projectsError = viewMode === "all" ? allProjectsError : orgProjectsError;

  const { data: activity, isLoading: isLoadingActivity, error: activityError } = typedApi.task.getOrgActivity.useQuery(
    { limit: 200, scope: viewMode === "all" ? "all" : "organization" },
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

  const scopeLabel =
    activity?.scope === "organization" ? t("scope.organization") : t("scope.personal");

  if (!projects || projects.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-fg-secondary">{t("empty")}</p>
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

    const completedByProjectSorted = [...completedByProjectSegments].sort((a, b) => b.value - a.value);
    const perProjectTop = completedByProjectSorted.slice(0, 6);
    const perProjectOtherTotal = completedByProjectSorted.slice(6).reduce((s, seg) => s + seg.value, 0);
    const perProjectPieSegments: PieSegment[] = [
      ...perProjectTop.map(seg => ({
        ...seg,
        projectId: projects.find(p => getProjectDisplayName(p, t("project.untitled")) === seg.label)?.id,
      })),
      ...(perProjectOtherTotal > 0
        ? [{
            key: "other_projects",
            label: t("perProject.otherProjects"),
            value: perProjectOtherTotal,
            strokeColor: colors.other,
          }]
        : []),
      {
        key: "remaining",
        label: t("labels.remaining"),
        value: Math.max(0, totalTasksAll - completedTasksAll),
        strokeColor: colors.remaining,
      },
    ].filter((s) => s.value > 0);

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
    const globalTop = globalSorted.slice(0, 5);
    const globalOtherTotal = globalSorted.slice(5).reduce((s, [, v]) => s + v, 0);

    const contributorShareSegments: PieSegment[] = [
      ...globalTop.map(([name, value], idx) => ({
        key: name,
        label: name,
        value,
        strokeColor: colors.palette[idx % colors.palette.length] ?? colors.other,
      })),
      ...(globalOtherTotal > 0
        ? [{ key: "other", label: t("labels.other"), value: globalOtherTotal, strokeColor: colors.other }]
        : []),
    ];

    // Task Status Distribution
    const statusCounts = {
      pending: allTasks.filter((t) => t.status === "pending").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      blocked: allTasks.filter((t) => t.status === "blocked").length,
    };

    const statusSegments: PieSegment[] = [
      { key: "completed", label: "Completed", value: statusCounts.completed, strokeColor: colors.completed },
      { key: "in_progress", label: "In Progress", value: statusCounts.in_progress, strokeColor: colors.palette[1] ?? colors.info },
      { key: "pending", label: "Pending", value: statusCounts.pending, strokeColor: colors.palette[2] ?? colors.warning },
      { key: "blocked", label: "Blocked", value: statusCounts.blocked, strokeColor: colors.error },
    ].filter((s) => s.value > 0);

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
      <div className="min-h-screen p-4 lg:p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-fg-primary">{t("title")}</h2>
          
          {/* Organization Switcher */}
          <div className="flex items-center gap-3">
            {orgs.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOrgDropdownOpen((v) => !v)}
                  className="h-9 inline-flex items-center gap-2 rounded-xl bg-bg-surface shadow-sm px-3 text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-elevated hover:shadow-md transition-colors"
                  aria-expanded={orgDropdownOpen}
                  aria-haspopup="menu"
                >
                  <span className="max-w-[150px] truncate">
                    {viewMode === "all" ? t("scope.allOrgs") : (activeName ?? tOrg("yourOrgs"))}
                  </span>
                  <ChevronDown size={14} className="text-fg-tertiary" />
                </button>

                {orgDropdownOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl bg-bg-secondary shadow-lg z-50"
                  >
                    <div className="px-3 py-2 text-xs font-medium text-fg-tertiary">
                      {tOrg("switchOrg")}
                    </div>

                    <div className="max-h-60 overflow-auto">
                      {/* All Organizations option */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleOrgPick("all")}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 transition-colors ${
                          viewMode === "all"
                            ? "bg-accent-primary/10 text-fg-primary"
                            : "hover:bg-bg-elevated text-fg-secondary"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{t("scope.allOrgs")}</div>
                          <div className="text-xs text-fg-tertiary">{t("scope.allOrgsDesc")}</div>
                        </div>
                        {viewMode === "all" && <Check size={14} className="text-accent-primary shrink-0" />}
                      </button>

                      <div className="h-px bg-border-subtle mx-3 my-1" />

                      {orgs.map((org) => {
                        const isActive = viewMode === "org" && activeOrgId === org.id;
                        return (
                          <button
                            key={org.id}
                            type="button"
                            role="menuitem"
                            onClick={() => handleOrgPick(org.id)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-3 transition-colors ${
                              isActive
                                ? "bg-accent-primary/10 text-fg-primary"
                                : "hover:bg-bg-elevated text-fg-secondary"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{org.name}</div>
                              {isActive && <div className="text-xs text-fg-tertiary">{tOrg("active")}</div>}
                            </div>
                            {isActive && <Check size={14} className="text-accent-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main charts layout - 2 column design */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Left column - Project Analytics (large) + Task Status below */}
          <div className="flex flex-col gap-6">
            <LargePieChart
              title={t("overall.title")}
              subtitle={t("overall.subtitle")}
              percent={overallPercent}
              completed={completedTasksAll}
              total={totalTasksAll}
              segments={overallSegments}
            />
            
            {/* Task Status Distribution - below Project Analytics */}
            <PieChart
              title="Task Status Distribution"
              subtitle="Breakdown by status"
              segments={statusSegments}
            />

            {/* New chart: Activity trend (last 7 days) */}
            <ActivityBarChart
              title={t("activityTrend.title")}
              subtitle={t("activityTrend.subtitle")}
              rows={activityRows}
            />
          </div>

          {/* Right column - Contributor and Per-project share stacked */}
          <div className="flex flex-col gap-6">
            <PieChart
              title={t("contributors.title")}
              subtitle={t("contributors.subtitle")}
              segments={contributorShareSegments}
            />

            {/* New/different data: tasks created vs completed */}
            <PieChart
              title={t("createdVsCompleted.title")}
              subtitle={t("createdVsCompleted.subtitle")}
              segments={([
                { key: "created", label: t("labels.created"), value: createdRows.length, strokeColor: colors.info },
                { key: "completed", label: t("labels.completed"), value: completionRows.length, strokeColor: colors.completed },
              ] as PieSegment[]).filter((s) => s.value > 0)}
            />

            <PieChart
              title={t("perProject.title")}
              subtitle={t("perProject.subtitle")}
              segments={perProjectPieSegments}
              onSegmentClick={(projectId) => {
                router.push(`/create?projectId=${projectId}`);
              }}
            />
          </div>
        </div>

        {/* Due Dates Section */}
        <div className="mb-8">
          <p className="text-sm font-semibold text-fg-primary mb-4">Due Dates</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-red-500/10 to-red-600/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <p className="text-xs font-medium text-fg-tertiary">Overdue</p>
              </div>
              <p className="text-3xl font-bold text-red-500">{overdueTasks}</p>
              <p className="text-xs text-fg-tertiary mt-2">Tasks past due date</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <p className="text-xs font-medium text-fg-tertiary">Due Today</p>
              </div>
              <p className="text-3xl font-bold text-orange-500">{dueTodayTasks}</p>
              <p className="text-xs text-fg-tertiary mt-2">Tasks due today</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <p className="text-xs font-medium text-fg-tertiary">Due This Week</p>
              </div>
              <p className="text-3xl font-bold text-blue-500">{dueThisWeekTasks}</p>
              <p className="text-xs text-fg-tertiary mt-2">Tasks due within 7 days</p>
            </div>
          </div>
        </div>

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
                  className="text-left p-3 rounded-lg shadow-sm hover:shadow-md hover:bg-bg-elevated/30 transition-colors"
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