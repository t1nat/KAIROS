"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./projectManagement";
import { InteractiveTimeline } from "./interactiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2, ArrowLeft, Folder } from "lucide-react";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get("projectId");
  
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    projectIdFromUrl ? parseInt(projectIdFromUrl) : null
  );
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showOtherProjects, setShowOtherProjects] = useState(false);

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

  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      void utils.project.getMyProjects.invalidate();
      if (data) setSelectedProjectId(data.id);
    },
    onError: (error) => alert(`Error: ${error.message}`),
  });

  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
      setShowTaskForm(false);
    },
    onError: (error) => alert(`Error: ${error.message}`),
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
      }, 100);
    },
    onError: (error, _, ctx) => {
      if (ctx?.previousProject && selectedProjectId) {
        utils.project.getById.setData({ id: selectedProjectId }, ctx.previousProject);
      }
      alert(`Error: ${error.message}`);
    },
  });

  const addCollaborator = api.project.addCollaborator.useMutation({
    onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
    onError: (e) => alert(`Error: ${e.message}`),
  });

  const removeCollaborator = api.project.removeCollaborator.useMutation({
    onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
    onError: (e) => alert(`Error: ${e.message}`),
  });

  const updateCollaboratorPermission = api.project.updateCollaboratorPermission.useMutation({
    onSuccess: () => void utils.project.getById.invalidate({ id: selectedProjectId! }),
    onError: (e) => alert(`Error: ${e.message}`),
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

  const isOwner = projectDetails?.createdById === userId;
  const hasWriteAccess = projectDetails?.userHasWriteAccess ?? false;

  const availableUsers: User[] = projectDetails
    ? [
        {
          id: projectDetails.createdById,
          name: "Project Owner",
          email: "owner@project.com",
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
    <div className="flex gap-6 relative w-full h-full">
      {/* LEFT SIDEBAR - Controls */}
      <div className="w-96 flex-shrink-0 space-y-4">
        {!selectedProjectId && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CreateProjectForm
              onSubmit={handleCreateProject}
              currentUser={{ id: userId, name: null, email: "", image: null }}
              isExpanded={true}
              onToggle={() => console.warn("CreateProjectForm onToggle not implemented")}
            />
          </div>
        )}

        {selectedProjectId && projectDetails && (
          <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
            {/* Project Header Card */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
              <div className="flex items-start justify-between mb-4">
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                >
                  <ArrowLeft size={20} className="text-[#E4DEAA] group-hover:text-[#A343EC]" />
                </button>

                <button
                  onClick={() => void refetchProjectDetails()}
                  className="p-2 text-[#E4DEAA] hover:text-[#A343EC] hover:bg-white/10 rounded-lg transition-all"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#A343EC]/30">
                  <Folder className="text-white" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-[#FBF9F5] mb-1 leading-tight">{projectDetails.title}</h2>
                  {projectDetails.description && (
                    <p className="text-sm text-[#E4DEAA]/80 leading-relaxed">{projectDetails.description}</p>
                  )}
                </div>
              </div>

              {!isOwner && (
                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium ${
                    hasWriteAccess 
                      ? "text-[#80C49B] bg-[#80C49B]/10 border border-[#80C49B]/30" 
                      : "text-[#E4DEAA] bg-white/5 border border-white/10"
                  }`}>
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
            </div>

            {/* Stats Card */}
            {projectDetails.tasks && projectDetails.tasks.length > 0 && (
              <div className="bg-gradient-to-br from-[#A343EC]/10 to-[#9448F2]/5 rounded-xl border border-[#A343EC]/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#A343EC]/20 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-[#A343EC]" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#A343EC]">
                        {projectDetails.tasks.filter((t) => t.status === "completed").length}
                      </p>
                      <p className="text-xs text-[#E4DEAA]">Completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#FBF9F5]">
                      {projectDetails.tasks.length}
                    </p>
                    <p className="text-xs text-[#E4DEAA]">Total Tasks</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add Task Accordion */}
            {hasWriteAccess && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#FBF9F5]">Add Task</span>
                  {showTaskForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showTaskForm && (
                  <div className="px-4 pb-4 border-t border-white/10">
                    <CreateTaskForm
                      projectId={selectedProjectId}
                      availableUsers={availableUsers}
                      onSubmit={handleCreateTask}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Team Members Accordion */}
            {isOwner && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setShowCollaborators(!showCollaborators)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                >
                  <span className="text-sm font-semibold text-[#FBF9F5]">Team Members</span>
                  {showCollaborators ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showCollaborators && (
                  <div className="px-4 pb-4 border-t border-white/10">
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
            )}
          </div>
        )}

        {/* Other Projects Dropdown */}
        {projects && projects.filter((p) => p.id !== selectedProjectId).length > 0 && selectedProjectId && (
          <div className="relative">
            <button
              onClick={() => setShowOtherProjects((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
            >
              <span className="text-sm font-semibold text-[#FBF9F5]">Other Projects</span>
              {showOtherProjects ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showOtherProjects && (
              <div className="mt-2 bg-[#0F1115] border border-white/10 rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto">
                {projects
                  .filter((p) => p.id !== selectedProjectId)
                  .map((project) => (
                    <button
                      key={project.id}
                      className="w-full text-left text-sm p-3 rounded-lg hover:bg-white/10 text-[#FBF9F5] transition-colors flex items-center gap-3"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowOtherProjects(false);
                      }}
                    >
                      <Folder size={16} className="text-[#A343EC] flex-shrink-0" />
                      <span className="truncate">{project.title}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDE - Timeline Display (No Container) */}
      <div className="flex-1 min-w-0">
        {selectedProjectId && projectDetails && (
          <InteractiveTimeline
            tasks={projectDetails.tasks as Task[]}
            onTaskStatusChange={handleTaskStatusChange}
            isReadOnly={!hasWriteAccess}
            projectTitle={projectDetails.title}
          />
        )}

        {!selectedProjectId && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#A343EC]/30">
                <Folder className="text-white" size={36} />
              </div>
              <h3 className="text-2xl font-bold text-[#FBF9F5] mb-3">Select a Project</h3>
              <p className="text-[#E4DEAA] leading-relaxed">
                Create a new project or select an existing one to view your interactive timeline
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}