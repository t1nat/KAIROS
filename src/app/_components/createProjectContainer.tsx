"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./projectManagement";
import { InteractiveTimeline } from "./interactiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2, ArrowLeft, Folder } from "lucide-react";

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
}

export function CreateProjectContainer({ userId }: CreateProjectContainerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  // new dropdown open/close
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

  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      void utils.project.getMyProjects.invalidate();
      if (data) setSelectedProjectId(data.id);
      setShowProjectForm(false);
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
<<<<<<< HEAD
    <div className="flex gap-6 relative">
=======
    <div className="max-w-md space-y-4">
      {/* Create Project Form or Project List */}
      {!selectedProjectId ? (
        <div className="space-y-4">
          {/* Existing Projects List */}
          {projects && projects.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[#E4DEEA] mb-3">Your Projects</h3>
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className="w-full p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#A343EC]/50 transition-all text-left group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#FBF9F5] mb-1 group-hover:text-[#A343EC] transition-colors">
                        {project.title}
                      </h4>
                      {project.description && (
                        <p className="text-sm text-[#E4DEAA] line-clamp-1">{project.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-[#59677C]">
                      {new Date(project.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
>>>>>>> 465a109bcba5ccfcb81e558bbcfadfbc0aaf4345

      {/* LEFT SIDEBAR */}
      <div className="w-96 flex-shrink-0 space-y-4">

        {!selectedProjectId && (
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="w-full px-4 py-3 bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A343EC]/30 transition-all text-sm"
          >
            + New Project
          </button>
        )}

        {showProjectForm && !selectedProjectId && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            <CreateProjectForm
              onSubmit={handleCreateProject}
              currentUser={{ id: userId, name: null, email: "", image: null }}
              isExpanded={true}
              onToggle={() => setShowProjectForm(false)}
            />
          </div>
        )}

        {selectedProjectId && projectDetails && (
          <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <div className="flex items-start justify-between mb-3">
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group"
                >
                  <ArrowLeft size={18} className="text-[#E4DEAA] group-hover:text-[#A343EC]" />
                </button>

                <button
                  onClick={() => void refetchProjectDetails()}
                  className="p-1.5 text-[#E4DEAA] hover:text-[#A343EC] hover:bg-white/5 rounded-lg transition-all"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <h2 className="text-lg font-bold text-[#FBF9F5] mb-1">{projectDetails.title}</h2>
              {projectDetails.description && (
                <p className="text-xs text-[#E4DEAA]">{projectDetails.description}</p>
              )}

              {hasWriteAccess && !isOwner && (
                <span className="inline-block mt-2 text-xs text-[#80C49B] bg-[#80C49B]/10 px-2 py-1 rounded">
                  Team Member
                </span>
              )}
            </div>

            {projectDetails.tasks?.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#E4DEAA] bg-white/5 px-3 py-2 rounded-lg border border-white/10">
                <CheckCircle2 size={14} className="text-[#80C49B]" />
                <span>
                  {projectDetails.tasks.filter((t) => t.status === "completed").length} /{" "}
                  {projectDetails.tasks.length} completed
                </span>
              </div>
            )}

            {hasWriteAccess && (
              <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs font-semibold text-[#FBF9F5]">Add Task</span>
                  {showTaskForm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showTaskForm && (
                  <div className="px-3 pb-3 border-t border-white/10">
                    <CreateTaskForm
                      projectId={selectedProjectId}
                      availableUsers={availableUsers}
                      onSubmit={handleCreateTask}
                    />
                  </div>
                )}
              </div>
            )}

            {isOwner && (
              <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setShowCollaborators(!showCollaborators)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                  <span className="text-xs font-semibold text-[#FBF9F5]">Team Members</span>
                  {showCollaborators ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showCollaborators && (
                  <div className="px-3 pb-3 border-t border-white/10">
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

            {projectDetails.tasks?.length > 0 && (
              <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                <InteractiveTimeline
                  tasks={projectDetails.tasks as Task[]}
                  onTaskStatusChange={handleTaskStatusChange}
                  isReadOnly={!hasWriteAccess}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDE — FLOATING FOLDER BUTTON */}
      <div className="flex-1 flex justify-end pt-4 pr-8">
        {projects && projects.filter((p) => p.id !== selectedProjectId).length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowOtherProjects((s) => !s)}
              className="w-16 h-16 bg-gradient-to-br from-[#A343EC] to-[#9448F2] rounded-xl 
                         flex items-center justify-center shadow-lg hover:scale-105 transition"
            >
              <Folder size={28} className="text-white" />
            </button>

            {showOtherProjects && (
              <div className="mt-2 right-0 absolute bg-[#0F1115] border border-white/10 rounded-xl shadow-xl p-2 w-56 z-20">
                {projects
                  .filter((p) => p.id !== selectedProjectId)
                  .map((project) => (
                    <button
                      key={project.id}
                      className="w-full text-left text-sm p-2 rounded-lg hover:bg-white/5 text-[#FBF9F5] transition-colors"
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowOtherProjects(false);
                      }}
                    >
                      {project.title}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}