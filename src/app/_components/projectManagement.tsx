"use client";

import { useState } from "react";
import { Plus, Users, Trash2 } from "lucide-react";
import Image from "next/image";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

interface ProjectFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    shareStatus: "private" | "shared_read" | "shared_write";
  }) => Promise<void>;
  currentUser: User;
}

export function CreateProjectForm({ onSubmit, currentUser }: ProjectFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [shareStatus, setShareStatus] = useState<"private" | "shared_read" | "shared_write">("private");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Project title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ title, description, shareStatus });
      // Reset form
      setTitle("");
      setDescription("");
      setShareStatus("private");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Project</h2>

      <div>
        <label htmlFor="project-title" className="block text-sm font-medium text-gray-700 mb-1">
          Project Title *
        </label>
        <input
          id="project-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter project title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your project..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sharing Settings
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="private"
              checked={shareStatus === "private"}
              onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
              className="text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span className="text-sm text-gray-700">Private - Only you can access</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="shared_read"
              checked={shareStatus === "shared_read"}
              onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
              className="text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span className="text-sm text-gray-700">Shared (Read) - Others can view</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="shared_write"
              checked={shareStatus === "shared_write"}
              onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
              className="text-blue-600 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <span className="text-sm text-gray-700">Shared (Write) - Others can edit</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={18} />
        {isSubmitting ? "Creating..." : "Create Project"}
      </button>
    </form>
  );
}

interface TaskFormProps {
  projectId: number;
  availableUsers: User[];
  onSubmit: (data: {
    title: string;
    description: string;
    assignedToId?: string;
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
  }) => Promise<void>;
}

export function CreateTaskForm({ projectId, availableUsers, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title,
        description,
        assignedToId: assignedToId || undefined,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });
      // Reset form
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setPriority("medium");
      setDueDate("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Task</h3>

      <div>
        <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
          Task Title *
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the task..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="task-assignee" className="block text-sm font-medium text-gray-700 mb-1">
            Assign To
          </label>
          <select
            id="task-assignee"
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={isSubmitting}
          >
            <option value="">Unassigned</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            disabled={isSubmitting}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700 mb-1">
          Due Date
        </label>
        <input
          id="task-due-date"
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={18} />
        {isSubmitting ? "Adding..." : "Add Task"}
      </button>
    </form>
  );
}

interface CollaboratorManagerProps {
  projectId: number;
  currentCollaborators: Array<{
    user: User;
    permission: "read" | "write";
  }>;
  onAddCollaborator: (email: string, permission: "read" | "write") => Promise<void>;
  onRemoveCollaborator: (userId: string) => Promise<void>;
  onUpdatePermission: (userId: string, permission: "read" | "write") => Promise<void>;
  isOwner: boolean;
}

export function CollaboratorManager({
  projectId,
  currentCollaborators,
  onAddCollaborator,
  onRemoveCollaborator,
  onUpdatePermission,
  isOwner,
}: CollaboratorManagerProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"read" | "write">("read");
  const [isAdding, setIsAdding] = useState(false);

  // Silence unused variable warnings - these are passed as props and may be used by parent
  void projectId;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsAdding(true);
    try {
      await onAddCollaborator(email, permission);
      setEmail("");
      setPermission("read");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} className="text-gray-700" />
        <h3 className="text-lg font-bold text-gray-800">Collaborators</h3>
      </div>

      {/* Add collaborator form */}
      {isOwner && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3">
          <div>
            <label htmlFor="collab-email" className="block text-sm font-medium text-gray-700 mb-1">
              Add by Email
            </label>
            <input
              id="collab-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={isAdding}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "read" | "write")}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              disabled={isAdding}
            >
              <option value="read">Can View</option>
              <option value="write">Can Edit</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !email.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isAdding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* Collaborator list */}
      <div className="space-y-2">
        {currentCollaborators.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No collaborators yet</p>
        ) : (
          currentCollaborators.map(({ user, permission: userPermission }) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
            >
              <div className="flex items-center gap-3">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-semibold">
                    {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-gray-500">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <select
                      value={userPermission}
                      onChange={(e) =>
                        onUpdatePermission(user.id, e.target.value as "read" | "write")
                      }
                      className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-900"
                    >
                      <option value="read">View</option>
                      <option value="write">Edit</option>
                    </select>
                    <button
                      onClick={() => onRemoveCollaborator(user.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                      title="Remove collaborator"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                    {userPermission === "read" ? "View" : "Edit"}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}