// src/app/_components/createProjectContainer.tsx - UPDATED WITH ORG PERMISSIONS
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./projectManagement";
import { InteractiveTimeline } from "./interactiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw, CheckCircle2 } from "lucide-react";

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
  const [showProjectForm, setShowProjectForm] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

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
      if (data) {
        setSelectedProjectId(data.id);
      }
      setShowProjectForm(false);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
      setShowTaskForm(false);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
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
          tasks: old.tasks?.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  completedAt: status === "completed" ? new Date() : null,
                }
              : task
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
    onError: (error, _, context) => {
      if (context?.previousProject && selectedProjectId) {
        utils.project.getById.setData({ id: selectedProjectId }, context.previousProject);
      }
      alert(`Error: ${error.message}`);
    },
  });

  const addCollaborator = api.project.addCollaborator.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const removeCollaborator = api.project.removeCollaborator.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateCollaboratorPermission = api.project.updateCollaboratorPermission.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleCreateProject = async (data: CreateProjectInput) => {
    createProject.mutate(data);
  };

  const handleCreateTask = async (data: CreateTaskInput) => {
    if (!selectedProjectId) return;
    createTask.mutate({
      ...data,
      projectId: selectedProjectId,
    });
  };

  const handleTaskStatusChange = (taskId: number, newStatus: "pending" | "in_progress" | "completed" | "blocked") => {
    updateTaskStatus.mutate({ taskId, status: newStatus });
  };

  const handleAddCollaborator = async (email: string, permission: "read" | "write") => {
    if (!selectedProjectId) return;
    addCollaborator.mutate({
      projectId: selectedProjectId,
      email,
      permission,
    });
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!selectedProjectId) return;
    removeCollaborator.mutate({
      projectId: selectedProjectId,
      collaboratorId,
    });
  };

  const handleUpdatePermission = async (collaboratorId: string, permission: "read" | "write") => {
    if (!selectedProjectId) return;
    updateCollaboratorPermission.mutate({
      projectId: selectedProjectId,
      collaboratorId,
      permission,
    });
  };

  const isOwner = projectDetails?.createdById === userId;
  // Use the new userHasWriteAccess field from the API
  const hasWriteAccess = projectDetails?.userHasWriteAccess ?? false;

  const availableUsers: User[] = projectDetails
    ? [
        { 
          id: projectDetails.createdById, 
          name: "Project Owner", 
          email: "owner@project.com",
          image: null 
        },
        ...(projectDetails.collaborators?.map((c) => ({
          id: c.collaboratorId,
          name: c.collaborator?.name ?? null,
          email: c.collaborator?.email ?? "",
          image: c.collaborator?.image ?? null,
        })) ?? [])
      ]
    : [];

  return (
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

          {/* Create New Project Form */}
          <CreateProjectForm
            onSubmit={handleCreateProject}
            currentUser={{ id: userId, name: null, email: "", image: null }}
            isExpanded={showProjectForm}
            onToggle={() => setShowProjectForm(!showProjectForm)}
          />
        </div>
      ) : projectDetails && (
        <div className="space-y-4">
          {/* Project Header */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setSelectedProjectId(null)}
                    className="text-[#E4DEAA] hover:text-[#A343EC] transition-colors text-sm"
                  >
                    ← Back
                  </button>
                  {hasWriteAccess && !isOwner && (
                    <span className="px-2 py-1 bg-[#80C49B]/20 text-[#80C49B] text-xs font-semibold rounded-md border border-[#80C49B]/30">
                      Team Member
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-[#FBF9F5] mb-2">{projectDetails.title}</h2>
                {projectDetails.description && (
                  <p className="text-sm text-[#E4DEAA]">{projectDetails.description}</p>
                )}
              </div>
              <button
                onClick={() => void refetchProjectDetails()}
                className="p-2 text-[#E4DEAA] hover:text-[#A343EC] hover:bg-white/5 rounded-lg transition-all"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </button>
            </div>
            
            {projectDetails.tasks && projectDetails.tasks.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-[#E4DEAA]">
                <CheckCircle2 size={16} className="text-[#80C49B]" />
                <span>
                  {projectDetails.tasks.filter(t => t.status === 'completed').length} / {projectDetails.tasks.length} tasks completed
                </span>
              </div>
            )}
          </div>

          {/* Task Form - ALL ORG MEMBERS CAN ADD TASKS */}
          {hasWriteAccess && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold text-[#FBF9F5]">Add Task</span>
                {showTaskForm ? <ChevronUp size={16} className="text-[#E4DEAA]" /> : <ChevronDown size={16} className="text-[#E4DEAA]" />}
              </button>
              {showTaskForm && (
                <div className="px-6 pb-6 border-t border-white/10">
                  <CreateTaskForm
                    projectId={selectedProjectId}
                    availableUsers={availableUsers}
                    onSubmit={handleCreateTask}
                  />
                </div>
              )}
            </div>
          )}

          {/* Collaborators - ONLY OWNER CAN MANAGE */}
          {isOwner && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
              <button
                onClick={() => setShowCollaborators(!showCollaborators)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
              >
                <span className="text-sm font-semibold text-[#FBF9F5]">Team Members</span>
                {showCollaborators ? <ChevronUp size={16} className="text-[#E4DEAA]" /> : <ChevronDown size={16} className="text-[#E4DEAA]" />}
              </button>
              {showCollaborators && (
                <div className="px-6 pb-6 border-t border-white/10">
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

          {/* Interactive Timeline - ALL ORG MEMBERS CAN UPDATE */}
          {projectDetails.tasks && projectDetails.tasks.length > 0 && (
            <InteractiveTimeline
              tasks={(projectDetails.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate,
                assignedTo: t.assignedTo ? {
                  id: t.assignedTo.id,
                  name: t.assignedTo.name,
                  image: t.assignedTo.image,
                } : null,
                completedAt: t.completedAt,
                orderIndex: t.orderIndex,
              })) as Task[])}
              onTaskStatusChange={handleTaskStatusChange}
              isReadOnly={!hasWriteAccess}
            />
          )}
        </div>
      )}
    </div>
  );
}