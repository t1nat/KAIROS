"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Image from "next/image";
import { FolderKanban, Plus, Archive, FolderOpen } from "lucide-react";

type Task = {
  id: number;
  status: string;
};

type Project = {
  id: number;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  status?: string;
  createdAt: Date;
  tasks?: Task[];
};

export function ProjectsListClient() {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);

  const { data: projects, isLoading } = api.project.getMyProjects.useQuery();
  const utils = api.useUtils();
  
  // eslint-disable-next-line
  const archiveProject: any = (api.project as any).archiveProject.useMutation({
    onSuccess: () => {
      void utils.project.getMyProjects.invalidate();
    },
  });
  // eslint-disable-next-line
  const reopenProject: any = (api.project as any).reopenProject.useMutation({
    onSuccess: () => {
      void utils.project.getMyProjects.invalidate();
    },
  });

  const activeProjects = projects?.filter((p) => p.status === "active" || !p.status) ?? [];
  const archivedProjects = projects?.filter((p) => p.status === "archived") ?? [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fg-tertiary">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-fg-primary">My Projects</h1>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-fg-secondary hover:text-fg-primary shadow-sm rounded-lg transition-colors"
        >
          <Archive size={16} />
          {showArchived ? "Hide Archived" : `Show Archived (${archivedProjects.length})`}
        </button>
      </div>

      {/* Active Projects */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-fg-primary mb-4">Active Projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Create New Project Button */}
          <button
            onClick={() => router.push("/create?action=new_project")}
            className="min-h-[200px] flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed border-border-light/30 hover:border-accent hover:bg-accent/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Plus size={24} className="text-accent" />
            </div>
            <span className="text-sm font-medium text-fg-secondary group-hover:text-accent transition-colors">
              Create New Project
            </span>
          </button>

          {/* Active Project Cards */}
          {activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              onArchive={() => archiveProject.mutate({ projectId: project.id })}
              onReopen={null}
            />
          ))}
        </div>

        {activeProjects.length === 0 && (
          <div className="text-center py-12 text-fg-tertiary">
            <FolderKanban size={48} className="mx-auto mb-3 opacity-50" />
            <p>No active projects yet. Create one to get started!</p>
          </div>
        )}
      </div>

      {/* Archived Projects */}
      {showArchived && archivedProjects.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <Archive size={20} />
            Archived Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {archivedProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onArchive={null}
                // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                onReopen={() => reopenProject.mutate({ projectId: project.id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  onArchive,
  onReopen,
}: {
  project: Project;
  onArchive: (() => void) | null;
  onReopen: (() => void) | null;
}) {
  const router = useRouter();
  const isArchived = project.status === "archived";

  const totalTasks = project.tasks?.length ?? 0;
  const completedTasks = project.tasks?.filter((t) => t.status === "completed").length ?? 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      className={`min-h-[200px] flex flex-col p-4 rounded-xl border transition-all ${
        isArchived
          ? "border-border-light/10 bg-bg-surface/50 opacity-60"
          : "border-border-light/20 hover:border-accent/40 hover:shadow-lg cursor-pointer"
      }`}
      onClick={() => !isArchived && router.push(`/create?projectId=${project.id}`)}
    >
      {/* Project Header */}
      <div className="flex items-start gap-3 mb-3">
        {project.imageUrl ? (
          <Image
            src={project.imageUrl}
            alt={project.title ?? "Project"}
            width={48}
            height={48}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
            <FolderKanban size={24} className="text-accent" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-fg-primary truncate">{project.title ?? "Untitled Project"}</h3>
          <p className="text-xs text-fg-tertiary">
            {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Project Description */}
      {project.description && (
        <p className="text-xs text-fg-secondary line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mt-auto">
        <div className="flex items-center justify-between text-xs text-fg-tertiary mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-fg-tertiary mt-2">
          <span>{completedTasks}/{totalTasks} tasks</span>
          {onArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="text-fg-tertiary hover:text-warning transition-colors"
              title="Archive project"
            >
              <Archive size={14} />
            </button>
          )}
          {onReopen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReopen();
              }}
              className="flex items-center gap-1 text-fg-tertiary hover:text-success transition-colors"
              title="Reopen project"
            >
              <FolderOpen size={14} />
              <span className="text-xs">Reopen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
