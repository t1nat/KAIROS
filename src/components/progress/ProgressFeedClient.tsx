"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import Image from "next/image";
import { ArrowLeft, Folder } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type TaskStatus = "pending" | "in_progress" | "completed" | "blocked";

type ProjectCard = {
  id: number;
  title: string;
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
      useQuery: (input?: undefined, opts?: { staleTime?: number }) => ProjectsQueryResult;
    };
  };
  task: {
    getOrgActivity: {
      useQuery: (
        input: { limit: number },
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
};

const PIE_COLORS = [
  "rgb(var(--accent-primary) / 1)",
  "rgb(var(--brand-blue) / 1)",
  "rgb(var(--brand-indigo) / 1)",
  "rgb(var(--brand-cyan) / 1)",
  "rgb(var(--brand-teal) / 1)",
  "rgb(var(--accent-secondary) / 1)",
  "rgb(var(--accent-tertiary) / 1)",
  "rgb(var(--success) / 1)",
  "rgb(var(--warning) / 1)",
  "rgb(var(--info) / 1)",
  "rgb(var(--error) / 1)",
];

const PIE_COLOR_OTHER = "rgb(var(--fg-tertiary) / 0.75)";
const PIE_COLOR_REMAINING = "rgb(var(--fg-quaternary) / 0.55)";
const PIE_COLOR_SUCCESS = "rgb(var(--success) / 1)";
const PIE_COLOR_WARNING = "rgb(var(--warning) / 1)";
const PIE_COLOR_INFO = "rgb(var(--info) / 1)";
const PIE_COLOR_ERROR = "rgb(var(--error) / 1)";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describePieSlice(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  if (endAngle - startAngle >= 359.99) {
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.001} ${cy - r} Z`;
  }
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function PieChart(props: { 
  segments: PieSegment[]; 
  title: string; 
  subtitle?: string;
}) {
  const total = props.segments.reduce((s, seg) => s + seg.value, 0);
  const safeTotal = total <= 0 ? 1 : total;

  const animationFrameRef = useRef<number | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  const segmentsKey = useMemo(
    () => props.segments.map((s) => `${s.key}:${s.value}`).join("|"),
    [props.segments]
  );

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setAnimProgress(0);

    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      setAnimProgress(easeOutCubic);
      if (t < 1) animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [segmentsKey]);

  let angle = 0;
  const slices = props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const sliceAngle = (s.value / safeTotal) * 360 * animProgress;
      const startAngle = angle;
      const endAngle = angle + sliceAngle;
      angle = endAngle;
      return {
        ...s,
        startAngle,
        endAngle,
        percent: (s.value / safeTotal) * 100,
      };
    });

  return (
    <div className="flex flex-col p-4 rounded-xl border border-border-light/10">
      <div className="mb-2">
        <p className="text-sm font-medium text-fg-primary">{props.title}</p>
        {props.subtitle && <p className="text-xs text-fg-tertiary">{props.subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-32 h-32 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-32 h-32" aria-label={props.title} role="img">
            <circle cx="50" cy="50" r="46" fill="rgb(var(--bg-tertiary) / 0.6)" />
            {slices.map((s) => (
              <path
                key={s.key}
                d={describePieSlice(50, 50, 46, s.startAngle, s.endAngle)}
                fill={s.strokeColor}
                stroke="rgb(var(--border-medium) / 0.35)"
                strokeWidth="0.5"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-lg font-semibold text-fg-primary">{total}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {props.segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <span
                key={s.key}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-fg-secondary"
              >
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.strokeColor }} />
                <span className="text-fg-primary">{s.label}</span>
                <span className="text-fg-tertiary">{s.value}</span>
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
  const total = props.segments.reduce((s, seg) => s + seg.value, 0);
  const safeTotal = total <= 0 ? 1 : total;
  const clampedPercent = Math.max(0, Math.min(100, props.percent));

  const animationFrameRef = useRef<number | null>(null);
  const [animProgress, setAnimProgress] = useState(0);

  const segmentsKey = useMemo(
    () => props.segments.map((s) => `${s.key}:${s.value}`).join("|"),
    [props.segments]
  );

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setAnimProgress(0);

    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      setAnimProgress(easeOutCubic);
      if (t < 1) animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [segmentsKey]);

  let angle = 0;
  const slices = props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const sliceAngle = (s.value / safeTotal) * 360 * animProgress;
      const startAngle = angle;
      const endAngle = angle + sliceAngle;
      angle = endAngle;
      return {
        ...s,
        startAngle,
        endAngle,
        percent: (s.value / safeTotal) * 100,
      };
    });

  return (
    <div className="flex flex-col items-center p-4 rounded-xl border border-border-light/10">
      <div className="text-center mb-3">
        <h3 className="text-base font-semibold text-fg-primary">{props.title}</h3>
        <p className="text-xs text-fg-tertiary">{props.subtitle}</p>
      </div>

      <div className="relative w-52 h-52">
        <svg viewBox="0 0 100 100" className="w-52 h-52" aria-label={props.title}>
          <circle cx="50" cy="50" r="46" fill="rgb(var(--bg-tertiary) / 0.6)" />
          {slices.map((s) => (
            <path
              key={s.key}
              d={describePieSlice(50, 50, 46, s.startAngle, s.endAngle)}
              fill={s.strokeColor}
              stroke="rgb(var(--border-medium) / 0.35)"
              strokeWidth="0.5"
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-4xl font-bold text-fg-primary">{Math.round(clampedPercent)}%</p>
          <p className="text-xs text-fg-tertiary">{props.completed}/{props.total}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {props.segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1.5 text-xs text-fg-secondary"
            >
              <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.strokeColor }} />
              <span className="text-fg-primary">{s.label}</span>
              <span className="text-fg-tertiary">{s.value}</span>
            </span>
          ))}
      </div>
    </div>
  );
}

function getProjectDisplayName(project: ProjectCard, untitledProjectLabel: string): string {
  return project.title || untitledProjectLabel;
}

function getProjectPhoto(project: ProjectCard): string | null {
  return project.createdByUser?.image ?? null;
}

function getProjectOwnerLabel(project: ProjectCard): string {
  return project.createdByUser?.name ?? project.createdByUser?.email ?? "";
}

export function ProgressFeedClient() {
  const t = useTranslations("progress");
  const locale = useLocale();

  const { data: projects, isLoading: isLoadingProjects, error: projectsError } =
    typedApi.project.getMyProjects.useQuery(undefined, {
      staleTime: 1000 * 30,
    });

  const { data: activity, isLoading: isLoadingActivity, error: activityError } = typedApi.task.getOrgActivity.useQuery(
    { limit: 200 },
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
        strokeColor: PIE_COLORS[paletteIndex % PIE_COLORS.length]!,
      });
      paletteIndex += 1;
    }

    const remainingAll = Math.max(0, totalTasksAll - completedTotalFromSegments);
    const overallSegments: PieSegment[] = [
      ...completedByProjectSegments,
      { key: "remaining", label: t("labels.remaining"), value: remainingAll, strokeColor: PIE_COLOR_REMAINING },
    ];

    const completedByProjectSorted = [...completedByProjectSegments].sort((a, b) => b.value - a.value);
    const perProjectTop = completedByProjectSorted.slice(0, 6);
    const perProjectOtherTotal = completedByProjectSorted.slice(6).reduce((s, seg) => s + seg.value, 0);
    const perProjectPieSegments: PieSegment[] = [
      ...perProjectTop,
      ...(perProjectOtherTotal > 0
        ? [{
            key: "other_projects",
            label: t("perProject.otherProjects"),
            value: perProjectOtherTotal,
            strokeColor: PIE_COLOR_OTHER,
          }]
        : []),
      {
        key: "remaining",
        label: t("labels.remaining"),
        value: Math.max(0, totalTasksAll - completedTasksAll),
        strokeColor: PIE_COLOR_REMAINING,
      },
    ].filter((s) => s.value > 0);

    const completionRows = activityRows.filter(
      (r) => r.action === "status_changed" && r.newValue === "completed"
    );
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

    const topContributor = globalSorted[0] ?? null;
    const topContributorLabel = topContributor?.[0] ?? "—";
    const topContributorCount = topContributor?.[1] ?? 0;

    const contributorShareSegments: PieSegment[] = [
      ...globalTop.map(([name, value], idx) => ({
        key: name,
        label: name,
        value,
        strokeColor: PIE_COLORS[idx % PIE_COLORS.length]!,
      })),
      ...(globalOtherTotal > 0
        ? [{ key: "other", label: t("labels.other"), value: globalOtherTotal, strokeColor: PIE_COLOR_OTHER }]
        : []),
    ];

    return (
      <div className="min-h-screen p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-fg-primary">{t("title")}</h2>
          <p className="text-xs text-fg-tertiary">{scopeLabel}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg border border-border-light/10">
            <p className="text-xs text-fg-tertiary">{t("stats.projects")}</p>
            <p className="text-2xl font-bold text-fg-primary">{projects.length}</p>
          </div>
          <div className="p-3 rounded-lg border border-border-light/10">
            <p className="text-xs text-fg-tertiary">{t("stats.tasks")}</p>
            <p className="text-2xl font-bold text-fg-primary">{totalTasksAll}</p>
          </div>
          <div className="p-3 rounded-lg border border-border-light/10">
            <p className="text-xs text-fg-tertiary">{t("stats.completed")}</p>
            <p className="text-2xl font-bold text-success">{completedTasksAll}</p>
          </div>
          <div className="p-3 rounded-lg border border-border-light/10">
            <p className="text-xs text-fg-tertiary">{t("stats.topContributor")}</p>
            <p className="text-sm font-medium text-fg-primary truncate">{topContributorLabel}</p>
            <p className="text-xs text-fg-tertiary">{t("stats.completions", { count: topContributorCount })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <LargePieChart
            title={t("overall.title")}
            subtitle={t("overall.subtitle")}
            percent={overallPercent}
            completed={completedTasksAll}
            total={totalTasksAll}
            segments={overallSegments}
          />

          <PieChart
            title={t("contributors.title")}
            subtitle={t("contributors.subtitle")}
            segments={contributorShareSegments}
          />

          <PieChart
            title={t("perProject.title")}
            subtitle={t("perProject.subtitle")}
            segments={perProjectPieSegments}
          />
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
                  className="text-left p-3 rounded-lg border border-border-light/10 hover:border-border-light/20 hover:bg-bg-elevated/30 transition-colors"
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
    { key: "done", label: t("labels.done"), value: completedTasks, strokeColor: PIE_COLOR_SUCCESS },
    { key: "remaining", label: t("labels.remaining"), value: remainingTasks, strokeColor: PIE_COLOR_REMAINING },
  ];

  const activitySegments: PieSegment[] = [
    { key: "completed", label: t("labels.completed"), value: categoryCounts.completed, strokeColor: PIE_COLOR_SUCCESS },
    { key: "created", label: t("labels.created"), value: categoryCounts.created, strokeColor: PIE_COLORS[0]! },
    { key: "updated", label: t("labels.updated"), value: categoryCounts.updated, strokeColor: PIE_COLOR_WARNING },
    { key: "status", label: t("labels.status"), value: categoryCounts.status, strokeColor: PIE_COLOR_INFO },
    { key: "deleted", label: t("labels.deleted"), value: categoryCounts.deleted, strokeColor: PIE_COLOR_ERROR },
    { key: "other", label: t("labels.other"), value: categoryCounts.other, strokeColor: PIE_COLOR_OTHER },
  ];

  const contributorSegments: PieSegment[] = [
    ...topContributors.map(([name, value], idx) => ({
      key: name,
      label: name,
      value,
      strokeColor: PIE_COLORS[idx % PIE_COLORS.length]!,
    })),
    ...(otherContribTotal > 0
      ? [{ key: "other", label: t("labels.other"), value: otherContribTotal, strokeColor: PIE_COLOR_OTHER }]
      : []),
  ];

  return (
    <div className="min-h-screen p-4 lg:p-6">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg border border-border-light/10">
          <p className="text-xs text-fg-tertiary">{t("stats.tasks")}</p>
          <p className="text-2xl font-bold text-fg-primary">{totalTasks}</p>
        </div>
        <div className="p-3 rounded-lg border border-border-light/10">
          <p className="text-xs text-fg-tertiary">{t("stats.completed")}</p>
          <p className="text-2xl font-bold text-success">{completedTasks}</p>
        </div>
        <div className="p-3 rounded-lg border border-border-light/10">
          <p className="text-xs text-fg-tertiary">{t("labels.activity")}</p>
          <p className="text-2xl font-bold text-fg-primary">{projectActivity.length}</p>
        </div>
        <div className="p-3 rounded-lg border border-border-light/10">
          <p className="text-xs text-fg-tertiary">{t("projectDetails.lastUpdate")}</p>
          <p className="text-sm font-medium text-fg-primary">
            {lastActivityAt
              ? new Intl.DateTimeFormat(locale).format(new Date(lastActivityAt))
              : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChart title={t("projectDetails.taskCompletion")} segments={completionSegments} />
        <PieChart title={t("projectDetails.activityCategories")} segments={activitySegments} />
        <PieChart title={t("contributors.title")} subtitle={t("contributors.subtitle")} segments={contributorSegments} />
      </div>
    </div>
  );
}