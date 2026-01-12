"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./ProjectManagement";
import { InteractiveTimeline } from "./InteractiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2, ArrowLeft, Folder, Trash2, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";

type Translator = (key: string, values?: Record<string, unknown>) => string;

interface CreateProjectContainerProps {
  userId: string;
}

interface CreateProjectInput {
  title: string;
  description: string;
  shareStatus: "private" | "shared_read" | "shared_write";
}

interface CreateTaskInput {
  title: string;
  description: string;
  assignedToId?: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface Collaborator {
  user: User;
  permission: "read" | "write";
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: Date | null;
  assignedTo: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  completedAt: Date | null;
  orderIndex: number;
  createdBy?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
}

export function CreateProjectContainer({ userId }: CreateProjectContainerProps) {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("create");
  const toast = useToast();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectIdFromUrl ? parseInt(projectIdFromUrl) : null
  );
  const [isCreateProjectExpanded, setIsCreateProjectExpanded] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [deleteProjectArmed, setDeleteProjectArmed] = useState(false);

  const utils = api.useUtils();

  const { data: projects } = api.project.getMyProjects.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

  const { data: projectDetails, refetch: refetchProjectDetails } = api.project.getById.useQuery(
    { id: selectedProjectId! },
    { 
      enabled: selectedProjectId !== null,
      staleTime: 1000 * 60,
    }
  );

  useEffect(() => {
    if (projectIdFromUrl) {
      const id = parseInt(projectIdFromUrl);
      if (!isNaN(id)) {
        setSelectedProjectId(id);
      }
    }
  }, [projectIdFromUrl]);

  useEffect(() => {
    if (!deleteProjectArmed) return;
    const tId = setTimeout(() => setDeleteProjectArmed(false), 4000);
    return () => clearTimeout(tId);
  }, [deleteProjectArmed]);

  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      void utils.project.getMyProjects.invalidate();
      if (data) setSelectedProjectId(data.id);
    },
    onError: (error) => toast.error(t("errors.generic", { message: error.message })),
  });

  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
      void utils.project.getMyProjects.invalidate();
      void utils.task.getOrgActivity.invalidate();
      setShowTaskForm(false);
    },
    onError: (error) => toast.error(t("errors.generic", { message: error.message })),
  });

  const updateTaskStatus = api.task.updateStatus.useMutation({
    onMutate: async ({ taskId, status }) => {
      if (!selectedProjectId) return;
      await utils.project.getById.cancel({ id: selectedProjectId });
      const previousProject = utils.project.getById.getData({ id: selectedProjectId });

      utils.project.getById.setData({ id: selectedProjectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks?.map((t) =>
            t.id === taskId
              ? { ...t, status, completedAt: status === "completed" ? new Date() : null }
              : t
          ),
        };
      });

      return { previousProject };
    },
    onSuccess: () => {
      setTimeout(() => {
        void utils.project.getById.invalidate({ id: selectedProjectId! });
        void utils.project.getMyProjects.invalidate();
        void utils.task.getOrgActivity.invalidate();
      }, 100);
    },
    onError: (error, _, ctx) => {
      if (ctx?.previousProject && selectedProjectId) {
        utils.project.getById.setData({ id: selectedProjectId }, ctx.previousProject);
      }
      toast.error(t("errors.generic", { message: error.message }));
    },
  });

  const addCollaborator = api.project.addCollaborator.useMutation({
    onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
    onError: (e) => toast.error(t("errors.generic", { message: e.message })),
  });

  const removeCollaborator = api.project.removeCollaborator.useMutation({
    onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
    onError: (e) => toast.error(t("errors.generic", { message: e.message })),
  });

  const updateCollaboratorPermission = api.project.updateCollaboratorPermission.useMutation({
    onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
    onError: (e) => toast.error(t("errors.generic", { message: e.message })),
  });

  const deleteProject = api.project.delete.useMutation({
    onSuccess: () => {
      setDeleteProjectArmed(false);
      setSelectedProjectId(null);
      void utils.project.getMyProjects.invalidate();
      toast.success("Project deleted");
    },
    onError: (error) => toast.error(t("errors.generic", { message: error.message })),
  });

  const handleCreateProject = async (data: CreateProjectInput) => createProject.mutate(data);

  const handleCreateTask = async (data: CreateTaskInput) => {
    if (!selectedProjectId) return;
    createTask.mutate({ ...data, projectId: selectedProjectId });
  };

  const handleTaskStatusChange = (taskId: number, status: Task["status"]) =>
    updateTaskStatus.mutate({ taskId, status });

  const handleAddCollaborator = async (email: string, permission: "read" | "write") => {
    if (selectedProjectId) {
      addCollaborator.mutate({ projectId: selectedProjectId, email, permission });
    }
  };

  const handleRemoveCollaborator = async (id: string) => {
    if (selectedProjectId) {
      removeCollaborator.mutate({ projectId: selectedProjectId, collaboratorId: id });
    }
  };

  const handleUpdatePermission = async (id: string, perm: "read" | "write") => {
    if (selectedProjectId) {
      updateCollaboratorPermission.mutate({ projectId: selectedProjectId, collaboratorId: id, permission: perm });
    }
  };

  const handleDeleteProject = () => {
    if (!selectedProjectId) return;

    if (!deleteProjectArmed) {
      setDeleteProjectArmed(true);
      toast.info("Click again to delete project");
      return;
    }

    deleteProject.mutate({ id: selectedProjectId });
  };

  const isOwner = projectDetails?.createdById === userId;
  const hasWriteAccess = projectDetails?.userHasWriteAccess ?? false;

  const availableUsers: User[] = projectDetails
    ? [
        {
          id: projectDetails.createdById,
          name: t("team.projectOwner"),
          email: "",
          image: null,
        },
        ...(projectDetails.collaborators?.map((c) => ({
          id: c.collaboratorId,
          name: c.collaborator?.name ?? null,
          email: c.collaborator?.email ?? "",
          image: c.collaborator?.image ?? null,
        })) ?? []),
      ]
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 relative w-full h-full max-w-7xl mx-auto">
      <div className="w-full lg:w-96 xl:w-[420px] lg:flex-shrink-0 space-y-3">
        {!selectedProjectId && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CreateProjectForm
              onSubmit={handleCreateProject}
              currentUser={{ id: userId, name: null, email: "", image: null }}
              isExpanded={isCreateProjectExpanded}
              onToggle={() => setIsCreateProjectExpanded((s) => !s)}
            />
          </div>
        )}

        {selectedProjectId && projectDetails && (
          <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="bg-bg-surface/40 backdrop-blur-sm rounded-xl p-4 ios-card">
              <div className="flex items-start justify-between mb-4">
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="p-2 hover:bg-bg-elevated rounded-lg transition-colors group"
                >
                  <ArrowLeft size={20} className="text-fg-primary group-hover:text-accent-primary" />
                </button>

                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={handleDeleteProject}
                      disabled={deleteProject.isPending}
                      className={`p-2 rounded-lg transition-all border ${
                        deleteProjectArmed
                          ? "bg-error/10 border-error/30 text-error"
                          : "text-fg-secondary border-transparent hover:text-error hover:bg-bg-elevated"
                      }`}
                      aria-label={deleteProjectArmed ? "Confirm delete project" : "Delete project"}
                    >
                      <Trash2 size={18} />
                    </button>
                  )}

                  <button
                    onClick={() => void refetchProjectDetails()}
                    className="p-2 text-fg-primary hover:text-accent-primary hover:bg-bg-elevated rounded-lg transition-all"
                    aria-label={t("actions.refresh")}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-primary/20">
                  <Folder className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-fg-primary mb-1 leading-tight">{projectDetails.title}</h2>
                  {projectDetails.description && (
                    <p className="text-sm text-fg-secondary leading-relaxed">{projectDetails.description}</p>
                  )}
                </div>
              </div>

              {!isOwner && (
                <div className="flex items-center gap-2 pt-3 border-t border-border-light/20">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border ${
                      hasWriteAccess
                        ? "text-success bg-success/10 border-success/30"
                        : "text-fg-secondary bg-bg-surface/50 border-border-light/30"
                    }`}
                  >
                    {hasWriteAccess ? (
                      <>
                        <CheckCircle2 size={12} />
                        {t("team.canEdit")}
                      </>
                    ) : (
                      t("team.viewOnly")
                    )}
                  </span>
                </div>
              )}
              
              {/* Team Members Section - Now integrated */}
              {isOwner && (
                <div className="mt-4 pt-4 border-t border-border-light/20">
                  <h3 className="text-sm font-semibold text-fg-primary mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    {t("team.title")}
                  </h3>
                  <CollaboratorManager
                    projectId={selectedProjectId}
                    currentCollaborators={(projectDetails.collaborators?.map((c) => ({
                      user: {
                        id: c.collaboratorId,
                        name: c.collaborator?.name ?? null,
                        email: c.collaborator?.email ?? "",
                        image: c.collaborator?.image ?? null,
                      },
                      permission: c.permission,
                    })) ?? []) as Collaborator[]}
                    onAddCollaborator={handleAddCollaborator}
                    onRemoveCollaborator={handleRemoveCollaborator}
                    onUpdatePermission={handleUpdatePermission}
                    isOwner={isOwner}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {selectedProjectId && projectDetails && (
          <div className="h-full">
            <InteractiveTimeline
              tasks={projectDetails.tasks as Task[]}
              onTaskStatusChange={handleTaskStatusChange}
              isReadOnly={!hasWriteAccess}
              projectTitle={projectDetails.title}
            />
          </div>
        )}

        {!selectedProjectId && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-8">
              <p className="text-sm text-fg-tertiary">Create or select a project to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}