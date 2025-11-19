// createProjectContainer
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./projectManagement";
import { InteractiveTimeline } from "./interactiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

interface CreateProjectContainerProps {
  userId: string;
}

export function CreateProjectContainer({ userId }: CreateProjectContainerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Queries
  const { data: projects, refetch: refetchProjects } = api.project.getMyProjects.useQuery();
  const { data: projectDetails, refetch: refetchProjectDetails } = api.project.getById.useQuery(
    { id: selectedProjectId! },
    { enabled: selectedProjectId !== null }
  );

  // Mutations
  const createProject = api.project.create.useMutation({
    onSuccess: (data) => {
      void refetchProjects();
      // FIXED: Check if data exists before accessing properties
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
      void refetchProjectDetails();
      setShowTaskForm(false);
      alert("Task created successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateTaskStatus = api.task.updateStatus.useMutation({
    onSuccess: () => {
      void refetchProjectDetails();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const addCollaborator = api.project.addCollaborator.useMutation({
    onSuccess: () => {
      void refetchProjectDetails();
      alert("Collaborator added successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const removeCollaborator = api.project.removeCollaborator.useMutation({
    onSuccess: () => {
      void refetchProjectDetails();
      alert("Collaborator removed!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateCollaboratorPermission = api.project.updateCollaboratorPermission.useMutation({
    onSuccess: () => {
      void refetchProjectDetails();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Handler functions
  const handleCreateProject = async (data: {
    title: string;
    description: string;
    shareStatus: "private" | "shared_read" | "shared_write";
  }) => {
    createProject.mutate(data);
  };

  const handleCreateTask = async (data: {
    title: string;
    description: string;
    assignedToId?: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
  }) => {
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
    c => c.collaboratorId === userId && c.permission === "write"
  ) ?? false);

  // Get available users for task assignment (collaborators + owner)
  const availableUsers = projectDetails
    ? [
        { 
          id: projectDetails.createdById, 
          name: "Project Owner", 
          email: "owner@project.com",
          image: null 
        },
        ...(projectDetails.collaborators?.map(c => ({
          id: c.collaboratorId,
          name: c.collaborator?.name ?? null,
          email: c.collaborator?.email ?? "",
          image: c.collaborator?.image ?? null,
        })) ?? [])
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Project selector */}
      {projects && projects.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <label htmlFor="project-select" className="block text-sm font-medium text-gray-700 mb-2">
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              New Project
            </button>
          </div>
        </div>
      )}

      {/* Create Project Form */}
      {showProjectForm && (
        <div>
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="mb-4 flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            {showProjectForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <span className="font-medium">New Project</span>
          </button>
          {showProjectForm && (
            <CreateProjectForm
              onSubmit={handleCreateProject}
              currentUser={{ id: userId, name: null, email: "", image: null }}
            />
          )}
        </div>
      )}

      {/* Selected Project Details */}
      {selectedProjectId && projectDetails && (
        <div className="space-y-6">
          {/* Project header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{projectDetails.title}</h2>
                {projectDetails.description && (
                  <p className="text-gray-600 mt-2">{projectDetails.description}</p>
                )}
              </div>
              <button
                onClick={() => void refetchProjectDetails()}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
            </div>
            
            <div className="flex gap-2 items-center text-sm text-gray-600">
              <span className={`px-3 py-1 rounded-full ${
                projectDetails.shareStatus === "private"
                  ? "bg-gray-200 text-gray-800"
                  : projectDetails.shareStatus === "shared_read"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-green-100 text-green-800"
              }`}>
                {projectDetails.shareStatus === "private" && "Private"}
                {projectDetails.shareStatus === "shared_read" && "Shared (View)"}
                {projectDetails.shareStatus === "shared_write" && "Shared (Edit)"}
              </span>
              <span>•</span>
              <span>Created {new Date(projectDetails.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Two-column layout for forms and collaborators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task form */}
            {hasWriteAccess && (
              <div>
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="mb-4 flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  {showTaskForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  <span className="font-medium">Add Task</span>
                </button>
                {showTaskForm && (
                  <CreateTaskForm
                    projectId={selectedProjectId}
                    availableUsers={availableUsers}
                    onSubmit={handleCreateTask}
                  />
                )}
              </div>
            )}

            {/* Collaborator manager */}
            <CollaboratorManager
              projectId={selectedProjectId}
              currentCollaborators={projectDetails.collaborators?.map(c => ({
                user: {
                  id: c.collaboratorId,
                  name: c.collaborator?.name ?? null,
                  email: c.collaborator?.email ?? "",
                  image: c.collaborator?.image ?? null,
                },
                // FIXED: Removed unnecessary type assertion
                permission: c.permission,
              })) ?? []}
              onAddCollaborator={handleAddCollaborator}
              onRemoveCollaborator={handleRemoveCollaborator}
              onUpdatePermission={handleUpdatePermission}
              isOwner={isOwner}
            />
          </div>

          {/* Interactive Timeline */}
          {projectDetails.tasks && projectDetails.tasks.length > 0 && (
            <InteractiveTimeline
              tasks={projectDetails.tasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                // FIXED: Removed unnecessary type assertions - TypeScript infers these correctly
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
              }))}
              onTaskStatusChange={handleTaskStatusChange}
              isReadOnly={!hasWriteAccess}
            />
          )}

          {(!projectDetails.tasks || projectDetails.tasks.length === 0) && hasWriteAccess && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">No tasks yet. Create your first task to get started!</p>
              <button
                onClick={() => setShowTaskForm(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
              >
                Create First Task
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}