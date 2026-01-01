"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import Image from "next/image";
import { ArrowLeft, Folder } from "lucide-react";

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

type DonutSegment = {
  key: string;
  label: string;
  value: number;
  strokeColor: string;
};

function ExcelProgressDonut(props: {
  title: string;
  subtitle: string;
  percent: number;
  completed: number;
  total: number;
  segments: DonutSegment[];
}) {
  const radius = 15.91549430918954;
  const clampedPercent = Math.max(0, Math.min(100, props.percent));

  const animationFrameRef = useRef<number | null>(null);
  const [fillProgress, setFillProgress] = useState(0);

  const total = props.segments.reduce((s, seg) => s + seg.value, 0);
  const safeTotal = total <= 0 ? 1 : total;

  const segmentsKey = useMemo(
    () => props.segments.map((s) => `${s.key}:${s.value}`).join("|"),
    [props.segments]
  );

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setFillProgress(0);

    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      setFillProgress(easeOutCubic);
      if (t < 1) animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [segmentsKey]);

  let offset = 0;
  const normalized = props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const percent = (s.value / safeTotal) * 100;
      const startOffset = offset;
      offset += percent;
      return { ...s, percent, startOffset };
    });

  return (
    <div className="rounded-xl border border-border-light/20 bg-bg-surface/50 p-5">
      <div className="flex flex-col items-center text-center gap-1">
        <h3 className="text-lg font-semibold text-fg-primary">{props.title}</h3>
        <p className="text-sm text-fg-secondary">{props.subtitle}</p>
      </div>

      <div className="mt-5 flex items-center justify-center">
        <div className="relative w-44 h-44">
          <svg viewBox="0 0 42 42" className="w-44 h-44" aria-label={props.title}>
            <g transform="rotate(-90 21 21)">
              <circle
                cx="21"
                cy="21"
                r={radius}
                fill="none"
                style={{ stroke: "rgb(var(--border-light))", opacity: 0.25 }}
                strokeWidth="4"
                pathLength={100}
              />

              {normalized.map((seg) => (
                <circle
                  key={seg.key}
                  cx="21"
                  cy="21"
                  r={radius}
                  fill="none"
                  style={{ stroke: seg.strokeColor }}
                  strokeWidth="4"
                  pathLength={100}
                  strokeDasharray={`${seg.percent * fillProgress} ${100 - seg.percent * fillProgress}`}
                  strokeDashoffset={-(seg.startOffset * fillProgress)}
                />
              ))}
            </g>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-semibold text-fg-primary">{Math.round(clampedPercent)}%</p>
          </div>
        </div>
      </div>

      <div className="mt-5 text-center">
        <p className="text-sm font-semibold tracking-wide text-fg-primary">OVERALL PROGRESS</p>
        <p className="text-sm text-fg-secondary">
          {props.completed} of {props.total} tasks
        </p>
      </div>
    </div>
  );
}

function DonutChart(props: { segments: DonutSegment[]; title: string }) {
  const radius = 15.91549430918954;
  const total = props.segments.reduce((s, seg) => s + seg.value, 0);
  const safeTotal = total <= 0 ? 1 : total;

  const animationFrameRef = useRef<number | null>(null);
  const [fillProgress, setFillProgress] = useState(0);

  const segmentsKey = useMemo(
    () => props.segments.map((s) => `${s.key}:${s.value}`).join("|"),
    [props.segments]
  );

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setFillProgress(0);

    const duration = 700;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - t, 3);
      setFillProgress(easeOutCubic);
      if (t < 1) animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [segmentsKey]);

  let offset = 0;
  const normalized = props.segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const percent = (s.value / safeTotal) * 100;
      const startOffset = offset;
      offset += percent;
      return { ...s, percent, startOffset };
    });

  return (
    <div className="rounded-xl border border-border-light/20 bg-bg-surface/50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-fg-primary">{props.title}</p>
          <p className="text-xs text-fg-tertiary">{total} total</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 42 42" className="w-20 h-20" aria-label={props.title}>
            <g transform="rotate(-90 21 21)">
              <circle
                cx="21"
                cy="21"
                r={radius}
                fill="none"
                style={{ stroke: "rgb(var(--border-light))", opacity: 0.3 }}
                strokeWidth="6"
                pathLength={100}
              />

              {normalized.map((seg) => (
                <circle
                  key={seg.key}
                  cx="21"
                  cy="21"
                  r={radius}
                  fill="none"
                  style={{ stroke: seg.strokeColor }}
                  strokeWidth="6"
                  pathLength={100}
                  strokeDasharray={`${seg.percent * fillProgress} ${100 - seg.percent * fillProgress}`}
                  strokeDashoffset={-(seg.startOffset * fillProgress)}
                />
              ))}
            </g>
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm font-semibold text-fg-primary">{total}</p>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            {props.segments
              .filter((s) => s.value > 0)
              .map((s) => (
                <span
                  key={s.key}
                  className="inline-flex items-center gap-2 rounded-full border border-border-light/20 bg-bg-surface/60 px-3 py-1 text-xs text-fg-secondary"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.strokeColor }} />
                  <span className="text-fg-primary">{s.label}</span>
                  <span className="text-fg-tertiary">{s.value}</span>
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getProjectDisplayName(project: ProjectCard): string {
  return project.title || "Untitled project";
}

function getProjectPhoto(project: ProjectCard): string | null {
  return project.createdByUser?.image ?? null;
}

function getProjectOwnerLabel(project: ProjectCard): string {
  return project.createdByUser?.name ?? project.createdByUser?.email ?? "";
}

export function ProgressFeedClient() {
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
      <div className="surface-card p-6">
        <p className="text-sm text-fg-secondary">Loading progress…</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="surface-card p-6">
        <p className="text-sm text-error">{errorMessage}</p>
      </div>
    );
  }


  const scopeLabel = activity?.scope === "organization" ? "Organization" : "Personal";

  if (!projects || projects.length === 0) {
    return (
      <div className="surface-card p-6">
        <p className="text-sm text-fg-secondary">No projects yet.</p>
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
    const palette: string[] = [
      "rgb(var(--accent-primary) / 1)",
      "rgb(var(--brand-purple) / 1)",
      "rgb(var(--brand-indigo) / 1)",
      "rgb(var(--brand-blue) / 1)",
      "rgb(var(--success) / 1)",
      "rgb(var(--warning) / 1)",
      "rgb(var(--info) / 1)",
      "rgb(var(--error) / 1)",
      "rgb(var(--accent-secondary) / 1)",
    ];

    const completedByProjectSegments: DonutSegment[] = [];
    let completedTotalFromSegments = 0;
    let paletteIndex = 0;
    for (const project of projectsSorted) {
      const projectCompleted = (project.tasks ?? []).filter((t) => t.status === "completed").length;
      if (projectCompleted <= 0) continue;

      completedTotalFromSegments += projectCompleted;
      completedByProjectSegments.push({
        key: String(project.id),
        label: getProjectDisplayName(project),
        value: projectCompleted,
        strokeColor: palette[paletteIndex % palette.length] ?? "rgb(var(--accent-primary) / 1)",
      });
      paletteIndex += 1;
    }

    const remainingAll = Math.max(0, totalTasksAll - completedTotalFromSegments);
    const overallSegments: DonutSegment[] = [
      ...completedByProjectSegments,
      { key: "remaining", label: "Remaining", value: remainingAll, strokeColor: "rgb(var(--bg-secondary) / 1)" },
    ];

    const activityRows = activity?.rows ?? [];
    const completionRows = activityRows.filter(
      (r) => r.action === "status_changed" && r.newValue === "completed"
    );
    const rowsForContributorShare = completionRows.length > 0 ? completionRows : activityRows;

    const globalContributorCounts = new Map<string, number>();
    for (const entry of rowsForContributorShare) {
      const displayName = entry.user?.name ?? entry.user?.email ?? "Someone";
      globalContributorCounts.set(
        displayName,
        (globalContributorCounts.get(displayName) ?? 0) + 1
      );
    }
    const globalSorted = Array.from(globalContributorCounts.entries()).sort((a, b) => b[1] - a[1]);
    const globalTop = globalSorted.slice(0, 5);
    const globalOtherTotal = globalSorted.slice(5).reduce((s, [, v]) => s + v, 0);

    const contributorPalette: string[] = [
      "rgb(var(--accent-primary) / 1)",
      "rgb(var(--success) / 1)",
      "rgb(var(--warning) / 1)",
      "rgb(var(--info) / 1)",
      "rgb(var(--error) / 1)",
    ];

    const contributorShareSegments: DonutSegment[] = [
      ...globalTop.map(([name, value], idx) => ({
        key: name,
        label: name,
        value,
        strokeColor: contributorPalette[idx] ?? "rgb(var(--bg-secondary) / 1)",
      })),
      ...(globalOtherTotal > 0
        ? [{ key: "other", label: "Other", value: globalOtherTotal, strokeColor: "rgb(var(--bg-secondary) / 1)" }]
        : []),
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-fg-primary">Progress</h2>
          <p className="text-xs text-fg-tertiary">{scopeLabel}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ExcelProgressDonut
            title="Project Analytics"
            subtitle="Real-time progress across all your projects"
            percent={overallPercent}
            completed={completedTasksAll}
            total={totalTasksAll}
            segments={overallSegments}
          />

          <DonutChart title="Contributor share (overall)" segments={contributorShareSegments} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projects.map((project) => {
            const title = getProjectDisplayName(project);
            const photo = getProjectPhoto(project);
            const ownerLabel = getProjectOwnerLabel(project);

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedProjectId(project.id)}
                className="text-left rounded-xl border border-border-light/20 bg-bg-surface/50 hover:bg-bg-elevated transition-colors px-4 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
                    {photo ? (
                      <Image
                        src={photo}
                        alt={title}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-cover"
                      />
                    ) : (
                      <Folder className="text-fg-secondary" size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg-primary truncate">{title}</p>
                    {ownerLabel ? <p className="text-xs text-fg-tertiary truncate">{ownerLabel}</p> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const projectTitle = getProjectDisplayName(selectedProject);
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

  const contributorCounts = new Map<string, number>();

  for (const entry of projectActivity) {
    const category = getCategory(entry);
    categoryCounts[category] += 1;

    const displayName = entry.user?.name ?? entry.user?.email ?? "Someone";
    contributorCounts.set(displayName, (contributorCounts.get(displayName) ?? 0) + 1);
  }

  const contributorsSorted = Array.from(contributorCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topContributors = contributorsSorted.slice(0, 5);
  const otherContribTotal = contributorsSorted.slice(5).reduce((s, [, v]) => s + v, 0);

  const contributorPalette: string[] = [
    "rgb(var(--accent-primary) / 1)",
    "rgb(var(--success) / 1)",
    "rgb(var(--warning) / 1)",
    "rgb(var(--info) / 1)",
    "rgb(var(--error) / 1)",
  ];

  const completionSegments: DonutSegment[] = [
    { key: "done", label: "Done", value: completedTasks, strokeColor: "rgb(var(--success) / 1)" },
    { key: "remaining", label: "Remaining", value: remainingTasks, strokeColor: "rgb(var(--bg-secondary) / 1)" },
  ];

  const activitySegments: DonutSegment[] = [
    { key: "completed", label: "Completed", value: categoryCounts.completed, strokeColor: "rgb(var(--success) / 1)" },
    { key: "created", label: "Created", value: categoryCounts.created, strokeColor: "rgb(var(--accent-primary) / 1)" },
    { key: "updated", label: "Updated", value: categoryCounts.updated, strokeColor: "rgb(var(--warning) / 1)" },
    { key: "status", label: "Status", value: categoryCounts.status, strokeColor: "rgb(var(--info) / 1)" },
    { key: "deleted", label: "Deleted", value: categoryCounts.deleted, strokeColor: "rgb(var(--error) / 1)" },
    { key: "other", label: "Other", value: categoryCounts.other, strokeColor: "rgb(var(--bg-secondary) / 1)" },
  ];

  const contributorSegments: DonutSegment[] = [
    ...topContributors.map(([name, value], idx) => ({
      key: name,
      label: name,
      value,
      strokeColor: contributorPalette[idx] ?? "rgb(var(--bg-secondary) / 1)",
    })),
    ...(otherContribTotal > 0
      ? [{ key: "other", label: "Other", value: otherContribTotal, strokeColor: "rgb(var(--bg-secondary) / 1)" }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setSelectedProjectId(null)}
            className="p-2 rounded-lg hover:bg-bg-elevated transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={18} className="text-fg-secondary" />
          </button>

          <div className="w-10 h-10 rounded-xl bg-bg-secondary overflow-hidden flex items-center justify-center flex-shrink-0">
            {projectPhoto ? (
              <Image
                src={projectPhoto}
                alt={projectTitle}
                width={40}
                height={40}
                className="w-10 h-10 object-cover"
              />
            ) : (
              <Folder className="text-fg-secondary" size={18} />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-fg-primary truncate">{projectTitle}</h2>
            <p className="text-xs text-fg-tertiary">{scopeLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border-light/20 bg-bg-surface/50 p-4">
          <p className="text-xs text-fg-tertiary">Tasks</p>
          <p className="text-lg font-semibold text-fg-primary">{totalTasks}</p>
        </div>
        <div className="rounded-xl border border-border-light/20 bg-bg-surface/50 p-4">
          <p className="text-xs text-fg-tertiary">Completed</p>
          <p className="text-lg font-semibold text-success">{completedTasks}</p>
        </div>
        <div className="rounded-xl border border-border-light/20 bg-bg-surface/50 p-4">
          <p className="text-xs text-fg-tertiary">Activity</p>
          <p className="text-lg font-semibold text-fg-primary">{projectActivity.length}</p>
        </div>
        <div className="rounded-xl border border-border-light/20 bg-bg-surface/50 p-4">
          <p className="text-xs text-fg-tertiary">Last update</p>
          <p className="text-sm font-medium text-fg-primary truncate">
            {lastActivityAt ? new Date(lastActivityAt).toLocaleDateString() : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <DonutChart title="Task completion" segments={completionSegments} />
        <DonutChart title="Activity categories" segments={activitySegments} />
      </div>

      <DonutChart title="Contributor share" segments={contributorSegments} />
    </div>
  );
}
