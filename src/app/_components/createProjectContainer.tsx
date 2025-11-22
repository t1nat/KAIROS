// src/app/_components/createProjectContainer.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./projectManagement";
import { InteractiveTimeline } from "./interactiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw, FolderKanban, Plus, CheckCircle2 } from "lucide-react";

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

  // Use tRPC utils for cache manipulation
  const utils = api.useUtils();

  // Queries with optimized settings
  const { data: projects } = api.project.getMyProjects.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  const { data: projectDetails, refetch: refetchProjectDetails } = api.project.getById.useQuery(
    { id: selectedProjectId! },
    { 
      enabled: selectedProjectId !== null,
      staleTime: 1000 * 60, // Consider data fresh for 1 minute
    }
  );

  // Mutations - simplified without complex optimistic updates to avoid TypeScript errors
  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      void utils.project.getMyProjects.invalidate();
      if (data) {
        setSelectedProjectId(data.id);
      }
      setShowProjectForm(false);
      alert("Project created successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const createTask = api.task.create.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
      setShowTaskForm(false);
      alert("Task created successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateTaskStatus = api.task.updateStatus.useMutation({
    onMutate: async ({ taskId, status }) => {
      if (!selectedProjectId) return;

      // Cancel outgoing refetches
      await utils.project.getById.cancel({ id: selectedProjectId });

      // Snapshot
      const previousProject = utils.project.getById.getData({ id: selectedProjectId });

      // Optimistically update
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
      // Invalidate after a short delay to ensure server is updated
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
      alert("Collaborator added successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const removeCollaborator = api.project.removeCollaborator.useMutation({
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
      alert("Collaborator removed!");
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

  // Handler functions
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
  const hasWriteAccess = isOwner ?? (projectDetails?.collaborators?.some(
    (c) => c.collaboratorId === userId && c.permission === "write"
  ) ?? false);

  // Get available users for task assignment (collaborators + owner)
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
    <div className="space-y-4">
      {/* Project selector */}
      {projects && projects.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 p-4">
          <label htmlFor="project-select" className="block text-xs font-semibold text-[#59677C] mb-2 uppercase tracking-wide">
            Select Project
          </label>
          <div className="flex gap-2">
            <select
              id="project-select"
              value={selectedProjectId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedProjectId(id);
                setShowProjectForm(false);
              }}
              className="flex-1 px-3.5 py-2.5 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2]/30 focus:border-[#9448F2] text-sm text-[#222B32] bg-[#FCFBF9]/30"
            >
              <option value="">-- Select a project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedProjectId(null);
                setShowProjectForm(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>
      )}

      {/* Create Project Form */}
      {showProjectForm && (
        <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 overflow-hidden">
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#FCFBF9] to-white hover:from-[#F8F5FF] hover:to-white transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-lg flex items-center justify-center shadow-sm">
                <FolderKanban className="text-white" size={14} />
              </div>
              <span className="text-base font-bold text-[#222B32]">New Project</span>
            </div>
            {showProjectForm ? <ChevronUp size={18} className="text-[#59677C]" /> : <ChevronDown size={18} className="text-[#59677C]" />}
          </button>
          {showProjectForm && (
            <div className="p-5 border-t border-[#DDE3E9]/50">
              <CreateProjectForm
                onSubmit={handleCreateProject}
                currentUser={{ id: userId, name: null, email: "", image: null }}
              />
            </div>
          )}
        </div>
      )}

      {/* Selected Project Details */}
      {selectedProjectId && projectDetails && (
        <div className="space-y-4">
          {/* Project header */}
          <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 overflow-hidden">
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#222B32] mb-1">{projectDetails.title}</h2>
                  {projectDetails.description && (
                    <p className="text-sm text-[#59677C]">{projectDetails.description}</p>
                  )}
                </div>
                <button
                  onClick={() => void refetchProjectDetails()}
                  className="p-2 text-[#59677C] hover:text-[#9448F2] hover:bg-[#9448F2]/5 rounded-lg transition-all"
                  title="Refresh"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  projectDetails.shareStatus === "private"
                    ? "bg-slate-100 text-slate-700"
                    : projectDetails.shareStatus === "shared_read"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {projectDetails.shareStatus === "private" && "🔒 Private"}
                  {projectDetails.shareStatus === "shared_read" && "👁️ View Only"}
                  {projectDetails.shareStatus === "shared_write" && "✏️ Collaborative"}
                </span>
                <span className="text-xs text-[#59677C]">
                  Created {new Date(projectDetails.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                {projectDetails.tasks && projectDetails.tasks.length > 0 && (
                  <>
                    <span className="text-[#DDE3E9]">•</span>
                    <span className="text-xs text-[#59677C] flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      {projectDetails.tasks.filter(t => t.status === 'completed').length} / {projectDetails.tasks.length} tasks
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Two-column layout for forms and collaborators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Task form */}
            {hasWriteAccess && (
              <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 overflow-hidden">
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FCFBF9] to-white hover:from-[#F8F5FF] hover:to-white transition-colors"
                >
                  <span className="text-sm font-semibold text-[#222B32]">Add Task</span>
                  {showTaskForm ? <ChevronUp size={16} className="text-[#59677C]" /> : <ChevronDown size={16} className="text-[#59677C]" />}
                </button>
                {showTaskForm && (
                  <div className="p-4 border-t border-[#DDE3E9]/50">
                    <CreateTaskForm
                      projectId={selectedProjectId}
                      availableUsers={availableUsers}
                      onSubmit={handleCreateTask}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Collaborator manager */}
            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-r from-[#FCFBF9] to-white border-b border-[#DDE3E9]/50">
                <span className="text-sm font-semibold text-[#222B32]">Collaborators</span>
              </div>
              <div className="p-4">
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
          </div>

          {/* Interactive Timeline */}
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

          {(!projectDetails.tasks || projectDetails.tasks.length === 0) && hasWriteAccess && (
            <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[#9448F2]/10 to-[#80C49B]/10 rounded-xl mb-4">
                <Plus className="text-[#9448F2]" size={24} />
              </div>
              <h3 className="text-lg font-semibold text-[#222B32] mb-2">No tasks yet</h3>
              <p className="text-sm text-[#59677C] mb-4">Create your first task to get started with this project</p>
              <button
                onClick={() => setShowTaskForm(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all inline-flex items-center gap-2"
              >
                <Plus size={16} />
                Create First Task
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}