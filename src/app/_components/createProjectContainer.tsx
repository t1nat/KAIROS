// src/app/_components/createProjectContainer.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { CreateProjectForm, CreateTaskForm, CollaboratorManager } from "./projectManagement";
import { InteractiveTimeline } from "./interactiveTimeline";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

// --- START: Inferred Type Definitions (Fixing the root cause) ---

// Infer the array type from the getMyProjects query
type ProjectsArray = NonNullable<ReturnType<typeof api.project.getMyProjects.useQuery>['data']>;
// Infer the type of a single Project from the array
type Project = ProjectsArray extends (infer T)[] ? T : never;

// Infer the Project Details type from the getById query (which includes tasks)
type ProjectDetails = NonNullable<ReturnType<typeof api.project.getById.useQuery>['data']>;

// Safely infer the Task type from the tasks array inside ProjectDetails
// This avoids the 'Property tasks does not exist' and 'no matching index signature' errors
type Task = ProjectDetails extends { tasks: (infer T)[] } ? T : never;

// --- END: Inferred Type Definitions ---

interface CreateProjectContainerProps {
  userId: string;
}

export function CreateProjectContainer({ userId }: CreateProjectContainerProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // Use tRPC utils for cache manipulation
  const utils = api.useUtils();

  // Queries with optimized settings
  // FIX: Removed unused variable 'refetchProjects' (L23)
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

  // Optimized mutations with cache updates
  const createProject = api.project.create.useMutation({
    onMutate: async (newProject) => {
      // Cancel outgoing refetches
      await utils.project.getMyProjects.cancel();

      // Snapshot the previous value
      // FIX: Explicitly type snapshot to fix 'Unsafe return of type any[]' (L71)
      const previousProjects: ProjectsArray | undefined = utils.project.getMyProjects.getData();

      // Optimistically update to the new value
      utils.project.getMyProjects.setData(undefined, (old) => {
        if (!old) return old;
        
        // Define the optimistic project object with the correct type (Project)
        // FIX: Replaced 'as any' with Project type for optimistic update (L70)
        // Use a temporary negative ID for optimistic data
        const optimisticId = -(old.length) - 1; 

        const optimisticProject: Project = {
            id: optimisticId, // Temporary ID
            ...newProject,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdById: userId,
            // WARNING: You must ensure all required fields on the Project type are included 
            // in this optimistic object, even if they are null/placeholder.
            // Assuming your Project type includes 'tasks' and 'collaborators' arrays:
            tasks: [], 
            collaborators: [],
            // Add any other required fields here if necessary based on your actual schema
        } as Project;

        return [
          ...old,
          optimisticProject,
        ];
      });

      return { previousProjects }; // FIX: Type-safe return
    },
    onSuccess: (data) => {
      // Invalidate to refetch with real data
      void utils.project.getMyProjects.invalidate();
      if (data) {
        setSelectedProjectId(data.id);
      }
      setShowProjectForm(false);
      alert("Project created successfully!");
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        // FIX: Context property is now typed, resolving 'Unsafe assignment' (L94)
        utils.project.getMyProjects.setData(undefined, context.previousProjects);
      }
      alert(`Error: ${error.message}`);
    },
  });

  const createTask = api.task.create.useMutation({
    onMutate: async (newTask) => {
      if (!selectedProjectId) return;

      // Cancel outgoing refetches
      await utils.project.getById.cancel({ id: selectedProjectId });

      // Snapshot
      // FIX: Explicitly type snapshot to fix 'Unsafe return' and 'Unexpected any' (L102)
      const previousProject: ProjectDetails | undefined = utils.project.getById.getData({ id: selectedProjectId });

      // Optimistically update
      utils.project.getById.setData({ id: selectedProjectId }, (old) => {
        if (!old) return old;
        
        // Define the optimistic task object with the correct type (Task)
        // FIX: Replaced 'as any' with Task type for optimistic update (L110)
        const optimisticId = -(old.tasks?.length || 0) - 1;

        const optimisticTask: Task = {
            id: optimisticId, // Temporary ID
            ...newTask,
            projectId: selectedProjectId,
            status: "pending", // Type inferred from Task is likely "pending" | "in_progress" | "completed" | "blocked"
            orderIndex: old.tasks?.length || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
            assignedTo: null,
            // Assuming assignedToId is part of the Task schema if assignedTo is null/optional
            assignedToId: newTask.assignedToId ?? null, 
        } as Task;

        return {
          ...old,
          tasks: [
            ...(old.tasks || []),
            optimisticTask,
          ],
        };
      });

      return { previousProject }; // FIX: Type-safe return
    },
    onSuccess: () => {
      void utils.project.getById.invalidate({ id: selectedProjectId! });
      setShowTaskForm(false);
      alert("Task created successfully!");
    },
    onError: (error, _, context) => {
      if (context?.previousProject && selectedProjectId) {
        // FIX: Context property is now typed, resolving 'Unsafe assignment' (L138)
        utils.project.getById.setData({ id: selectedProjectId }, context.previousProject);
      }
      alert(`Error: ${error.message}`);
    },
  });

  const updateTaskStatus = api.task.updateStatus.useMutation({
    onMutate: async ({ taskId, status }) => {
      if (!selectedProjectId) return;

      // Cancel outgoing refetches
      await utils.project.getById.cancel({ id: selectedProjectId });

      // Snapshot
      // FIX: Explicitly type snapshot to resolve 'Unsafe return'
      const previousProject: ProjectDetails | undefined = utils.project.getById.getData({ id: selectedProjectId });

      // Optimistically update
      utils.project.getById.setData({ id: selectedProjectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks?.map(task =>
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

      return { previousProject }; // FIX: Type-safe return
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
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
          <label htmlFor="project-select" className="block text-sm font-semibold text-slate-700 mb-3">
            Select Project
          </label>
          <div className="flex gap-3">
            <select
              id="project-select"
              value={selectedProjectId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? parseInt(e.target.value) : null;
                setSelectedProjectId(id);
                setShowProjectForm(false);
              }}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900 bg-white"
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
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
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
            className="mb-4 flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium"
          >
            {showProjectForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            <span>New Project</span>
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
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">{projectDetails.title}</h2>
                {projectDetails.description && (
                  <p className="text-slate-600 mt-2">{projectDetails.description}</p>
                )}
              </div>
              <button
                onClick={() => void refetchProjectDetails()}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                title="Refresh"
              >
                <RefreshCw size={20} />
              </button>
            </div>
            
            <div className="flex gap-2 items-center text-sm text-slate-600">
              <span className={`px-3 py-1 rounded-full font-medium ${
                projectDetails.shareStatus === "private"
                  ? "bg-slate-200 text-slate-800"
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
                  className="mb-4 flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium"
                >
                  {showTaskForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  <span>Add Task</span>
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
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
              <p className="text-slate-600 mb-4">No tasks yet. Create your first task to get started!</p>
              <button
                onClick={() => setShowTaskForm(true)}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all duration-300"
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