"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./ProjectManagement";
import { InteractiveTimeline } from "./InteractiveTimeline";
import { ProjectPlanningAgentButton } from "./ProjectPlanningAgentButton";
import { ChevronDown, RefreshCw, CheckCircle2, ArrowLeft, Folder, Trash2, Users, Plus } from "lucide-react";
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
  const projectIdFromUrl = searchParams?.get("projectId");
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectIdFromUrl ? parseInt(projectIdFromUrl) : null
  );

  const [isCreateProjectExpanded, setIsCreateProjectExpanded] = useState(false);
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
        // Owner
        ...(projectDetails.createdById
          ? [
              {
                id: projectDetails.createdById,
                name:
                  projectDetails.createdBy?.name ??
                  projectDetails.createdBy?.email ??
                  t("team.projectOwner"),
                email: projectDetails.createdBy?.email ?? "",
                image: projectDetails.createdBy?.image ?? null,
              },
            ]
          : []),
        // Collaborators
        ...(projectDetails.collaborators?.map((c) => ({
          id: c.collaboratorId,
          name: c.collaborator?.name ?? null,
          email: c.collaborator?.email ?? "",
          image: c.collaborator?.image ?? null,
        })) ?? []),
      ]
    : [];

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-b from-transparent via-gray-50/20 to-transparent dark:from-transparent dark:via-gray-900/20 dark:to-transparent">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-8 pb-6">
          <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif] mb-2">
            Create & Manage Projects
          </h1>
          <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-gray-600 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
            Create new projects, manage tasks, and collaborate with your team
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 relative w-full">
          {/* Left Sidebar - Projects List & Create */}
          <div className="w-full lg:w-80 xl:w-96 lg:flex-shrink-0 space-y-4">
            {/* Create New Project Card - iPhone Style */}
            {!selectedProjectId && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <div className="bg-gray-100/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-2xl overflow-hidden border border-gray-300/30 dark:border-gray-700/30 shadow-sm">
                  <button
                    onClick={() => setIsCreateProjectExpanded(!isCreateProjectExpanded)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-200/30 dark:hover:bg-gray-800/30 active:bg-gray-200/40 dark:active:bg-gray-800/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-300/50 dark:bg-gray-700/50 flex items-center justify-center backdrop-blur-sm">
                        <Plus size={18} className="text-gray-700 dark:text-gray-300" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-[16px] font-[510] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif]">
                          Create New Project
                        </div>
                        <div className="text-[13px] text-gray-600 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
                          Start a new project from scratch
                        </div>
                      </div>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className={`text-gray-500 dark:text-gray-400 transition-all duration-300 ${isCreateProjectExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  
                  {isCreateProjectExpanded && (
                    <div className="px-5 pb-5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
                        <CreateProjectForm
                          onSubmit={handleCreateProject}
                          currentUser={{ id: userId, name: null, email: "", image: null }}
                          isExpanded={isCreateProjectExpanded}
                          onToggle={() => setIsCreateProjectExpanded((s) => !s)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Existing Projects List */}
            {!selectedProjectId && projects && projects.length > 0 && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <h2 className="text-[17px] font-[590] text-gray-900 dark:text-white mb-3 font-[system-ui,Kairos,sans-serif] pl-2">
                  My Projects ({projects.length})
                </h2>
                <div className="space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gray-100/60 dark:bg-gray-900/60 backdrop-blur-lg hover:bg-gray-200/40 dark:hover:bg-gray-800/40 active:scale-[0.995] transition-all duration-200 group text-left border border-gray-300/30 dark:border-gray-700/30 shadow-sm"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-300/50 dark:bg-gray-700/50 flex items-center justify-center backdrop-blur-sm">
                        <Folder size={18} className="text-gray-700 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-[510] text-gray-900 dark:text-white truncate">
                          {project.title || t("project.untitled")}
                        </p>
                        <p className="text-[13px] text-gray-600 dark:text-gray-400 truncate">
                          {project.tasks?.length ?? 0} tasks
                        </p>
                      </div>
                      <ChevronDown size={16} className="text-gray-500 dark:text-gray-400 -rotate-90" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedProjectId && projectDetails && (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-300">
                {/* Project Header Card */}
                <div className="bg-gray-100/60 dark:bg-gray-900/60 backdrop-blur-lg rounded-2xl overflow-hidden border border-gray-300/30 dark:border-gray-700/30 shadow-sm">
                  <div className="p-5">
                    {/* Back Button & Actions */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setSelectedProjectId(null)}
                        className="flex items-center gap-2 p-2.5 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300/30 dark:hover:bg-gray-800/30 rounded-xl transition-all duration-200 group"
                      >
                        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-[14px] font-medium">All Projects</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => void refetchProjectDetails()}
                          className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-300/30 dark:hover:bg-gray-800/30 rounded-xl transition-all duration-200"
                          aria-label={t("actions.refresh")}
                        >
                          <RefreshCw size={18} />
                        </button>
                        
                        {isOwner && (
                          <button
                            onClick={handleDeleteProject}
                            disabled={deleteProject.isPending}
                            className={`p-2.5 rounded-xl transition-all duration-200 ${
                              deleteProjectArmed
                                ? "bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                                : "text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10"
                            }`}
                            aria-label={deleteProjectArmed ? "Confirm delete project" : "Delete project"}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Project Title & Description */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-300/50 dark:bg-gray-700/50 flex items-center justify-center backdrop-blur-sm">
                        <Folder className="text-gray-700 dark:text-gray-300" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-[20px] font-[590] text-gray-900 dark:text-white mb-1 leading-tight">{projectDetails.title}</h2>
                        {projectDetails.description && (
                          <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed">{projectDetails.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Access Indicator */}
                    {!isOwner && (
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg font-medium backdrop-blur-sm ${
                            hasWriteAccess
                              ? "text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/10"
                              : "text-gray-600 dark:text-gray-400 bg-gray-300/30 dark:bg-gray-700/30"
                          }`}
                        >
                          {hasWriteAccess ? (
                            <>
                              <CheckCircle2 size={12} />
                              Can Edit
                            </>
                          ) : (
                            "View Only"
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Team Members Section */}
                    {isOwner && (
                      <div className="mt-4 pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
                        <h3 className="text-[15px] font-[510] text-gray-900 dark:text-white mb-3 flex items-center gap-2 pl-1">
                          <Users size={16} className="text-gray-600 dark:text-gray-400" />
                          Team Members
                        </h3>
                        <div className="space-y-3">
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
                      </div>
                    )}

                    {/* Add Task Section */}
                    {hasWriteAccess && (
                      <div className="mt-4 pt-4 border-t border-gray-300/20 dark:border-gray-700/20">
                        <div className="space-y-4">
                          <h3 className="text-[15px] font-[510] text-gray-900 dark:text-white mb-2 pl-1">
                            Add New Task
                          </h3>
                          <CreateTaskForm
                            projectId={selectedProjectId}
                            onSubmit={handleCreateTask}
                            availableUsers={availableUsers}
                          />

                          <ProjectPlanningAgentButton projectId={selectedProjectId} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content Area */}
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
              <div className="h-[320px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-accent-primary/20 flex items-center justify-center mb-4">
                  <Folder size={24} className="text-accent-primary" />
                </div>
                <div className="text-center max-w-md px-8">
                  <h3 className="text-[17px] font-[510] text-fg-primary mb-2">
                    Select a Project
                  </h3>
                  <p className="text-[14px] text-fg-secondary">
                    Choose an existing project from the list or create a new one to get started
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-10"></div>
      </div>
    </div>
  );
}