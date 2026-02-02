"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Image from "next/image";
import { FolderKanban, Plus, Archive, FolderOpen, ChevronRight } from "lucide-react";

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
      <div className="w-full h-full overflow-y-auto bg-bg-primary">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="pt-8 pb-6">
            <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-fg-primary font-[system-ui,Kairos,sans-serif] mb-2">
              My Projects
            </h1>
            <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-fg-tertiary font-[system-ui,Kairos,sans-serif]">
              Manage your active and archived projects
            </p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-bg-surface rounded-xl"></div>
            <div className="h-64 bg-bg-surface rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-8 pb-6">
          <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-fg-primary font-[system-ui,Kairos,sans-serif] mb-2">
            My Projects
          </h1>
          <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-fg-tertiary font-[system-ui,Kairos,sans-serif]">
            Manage your active and archived projects
          </p>
        </div>

        {/* Archived Projects Toggle Card */}
        <div className="mb-6">
          <div className="bg-bg-surface rounded-xl overflow-hidden">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-tertiary/5 active:bg-bg-tertiary/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-bg-tertiary/10 flex items-center justify-center">
                  <Archive size={18} className="text-fg-tertiary" strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[16px] font-[510] text-fg-primary font-[system-ui,Kairos,sans-serif]">
                    Show Archived Projects
                  </div>
                  <div className="text-[13px] text-fg-tertiary font-[system-ui,Kairos,sans-serif]">
                    {archivedProjects.length} projects archived
                  </div>
                </div>
              </div>
              <ChevronRight 
                size={20} 
                className={`text-fg-tertiary transition-transform ${showArchived ? "rotate-90" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Active Projects Section */}
        <div className="mb-8">
          <h2 className="text-[17px] font-[590] text-fg-primary mb-4 font-[system-ui,Kairos,sans-serif]">
            Active Projects ({activeProjects.length})
          </h2>
          
          {/* Create New Project Card */}
          <div className="mb-5">
            <div className="bg-bg-surface rounded-xl overflow-hidden">
              <button
                onClick={() => router.push("/create?action=new_project")}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-tertiary/5 active:bg-bg-tertiary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-bg-tertiary/10 flex items-center justify-center">
                    <Plus size={18} className="text-fg-secondary" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-[16px] font-[510] text-fg-primary font-[system-ui,Kairos,sans-serif]">
                      Create New Project
                    </div>
                    <div className="text-[13px] text-fg-tertiary font-[system-ui,Kairos,sans-serif]">
                      Start a new project from scratch
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-fg-tertiary" />
              </button>
            </div>
          </div>

          {/* Active Project Cards */}
          <div className="space-y-4">
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
            <div className="bg-bg-surface rounded-xl overflow-hidden">
              <div className="px-5 py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-bg-tertiary/10 flex items-center justify-center mx-auto mb-4">
                  <FolderKanban size={24} className="text-fg-tertiary" />
                </div>
                <div className="text-[16px] font-[510] text-fg-primary mb-2 font-[system-ui,Kairos,sans-serif]">
                  No active projects
                </div>
                <div className="text-[13px] text-fg-tertiary font-[system-ui,Kairos,sans-serif]">
                  Create your first project to get started
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Archived Projects Section */}
        {showArchived && archivedProjects.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[17px] font-[590] text-fg-primary mb-4 font-[system-ui,Kairos,sans-serif]">
              Archived Projects ({archivedProjects.length})
            </h2>
            <div className="space-y-4">
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

        {/* Bottom Spacing */}
        <div className="h-10"></div>
      </div>
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
    <div className="bg-bg-surface rounded-xl overflow-hidden">
      <button
        onClick={() => router.push(`/create?projectId=${project.id}`)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-tertiary/5 active:bg-bg-tertiary/10 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {project.imageUrl ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={project.imageUrl}
                alt={project.title ?? "Project"}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 bg-bg-tertiary/10">
              <FolderKanban size={20} className="text-fg-tertiary" />
            </div>
          )}
          
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-[510] text-fg-primary truncate mb-1 font-[system-ui,Kairos,sans-serif]">
                  {project.title ?? "Untitled Project"}
                </div>
                <div className="text-[13px] text-fg-tertiary truncate font-[system-ui,Kairos,sans-serif]">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
                {project.description && (
                  <div className="text-[13px] text-fg-tertiary mt-1 line-clamp-1 font-[system-ui,Kairos,sans-serif]">
                    {project.description}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {!isArchived && onArchive && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive();
                    }}
                    className="text-fg-tertiary hover:text-fg-secondary transition-colors p-1"
                    title="Archive project"
                  >
                    <Archive size={16} />
                  </button>
                )}
                {isArchived && onReopen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReopen();
                    }}
                    className="text-fg-tertiary hover:text-fg-secondary transition-colors p-1"
                    title="Reopen project"
                  >
                    <FolderOpen size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-[12px] text-fg-tertiary mb-1 font-[system-ui,Kairos,sans-serif]">
                <span>Progress</span>
                <span className="font-medium text-fg-secondary">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-bg-tertiary/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    isArchived ? "bg-fg-tertiary/50" : "bg-accent-primary"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[12px] text-fg-tertiary mt-1 font-[system-ui,Kairos,sans-serif]">
                {completedTasks} of {totalTasks} tasks completed
              </div>
            </div>
          </div>
        </div>
        
        <ChevronRight size={20} className="text-fg-tertiary ml-4 flex-shrink-0" />
      </button>
    </div>
  );
}