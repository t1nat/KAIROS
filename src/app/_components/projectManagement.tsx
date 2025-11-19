// src/app/_components/projectManagement.tsx
"use client";

import { useState } from "react";
import { Plus, Users, Trash2, Shield, Eye, Edit } from "lucide-react";
import Image from "next/image";

// Professional Design System
const CARD_BG = "bg-white";
const INPUT_BASE = "w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-900";
const LABEL_STYLE = "block text-sm font-semibold text-slate-700 mb-2";
const BUTTON_PRIMARY = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg";
const BUTTON_SECONDARY = "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300";
const BUTTON_DANGER = "bg-red-600 text-white hover:bg-red-700 shadow-sm";
const BUTTON_BASE = "px-4 py-2 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

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
  const [shareStatus, setShareStatus] = useState<
    "private" | "shared_read" | "shared_write"
  >("private");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Silence unused variable warning
  void currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Project title is required");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ title, description, shareStatus });
      setTitle("");
      setDescription("");
      setShareStatus("private");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${CARD_BG} rounded-2xl shadow-lg p-8 border border-slate-200`}
    >
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Plus size={20} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Create New Project</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="project-title" className={LABEL_STYLE}>
            Project Title <span className="text-red-500">*</span>
          </label>
          <input
            id="project-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter project title..."
            className={INPUT_BASE}
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="project-description" className={LABEL_STYLE}>
            Description
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project..."
            rows={3}
            className={`${INPUT_BASE} resize-none`}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className={`${LABEL_STYLE} mb-3`}>
            Sharing Settings
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
              <input
                type="radio"
                value="private"
                checked={shareStatus === "private"}
                onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
                className="text-indigo-600 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Shield size={16} />
                  Private
                </div>
                <div className="text-sm text-slate-600">Only you can access this project</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
              <input
                type="radio"
                value="shared_read"
                checked={shareStatus === "shared_read"}
                onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
                className="text-indigo-600 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Eye size={16} />
                  Shared (View)
                </div>
                <div className="text-sm text-slate-600">Others can view this project</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-all">
              <input
                type="radio"
                value="shared_write"
                checked={shareStatus === "shared_write"}
                onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
                className="text-indigo-600 focus:ring-indigo-500"
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Edit size={16} />
                  Shared (Edit)
                </div>
                <div className="text-sm text-slate-600">Others can edit this project</div>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className={`w-full flex items-center justify-center gap-2 ${BUTTON_BASE} ${BUTTON_PRIMARY}`}
        >
          <Plus size={20} />
          {isSubmitting ? "Creating..." : "Create Project"}
        </button>
      </div>
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

export function CreateTaskForm({
  projectId,
  availableUsers,
  onSubmit,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [priority, setPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Silence unused variable warning
  void projectId;

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
      setTitle("");
      setDescription("");
      setAssignedToId("");
      setPriority("medium");
      setDueDate("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityColors = {
    low: "border-blue-300 bg-blue-50 text-blue-700",
    medium: "border-yellow-300 bg-yellow-50 text-yellow-700",
    high: "border-orange-300 bg-orange-50 text-orange-700",
    urgent: "border-red-300 bg-red-50 text-red-700",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`${CARD_BG} rounded-2xl shadow-lg p-8 border border-slate-200`}
    >
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Plus size={20} className="text-purple-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Add New Task</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label htmlFor="task-title" className={LABEL_STYLE}>
            Task Title <span className="text-red-500">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter task title..."
            className={INPUT_BASE}
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="task-description" className={LABEL_STYLE}>
            Description
          </label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the task..."
            rows={2}
            className={`${INPUT_BASE} resize-none`}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="task-assignee" className={LABEL_STYLE}>
              Assign To
            </label>
            <select
              id="task-assignee"
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className={INPUT_BASE}
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
            <label htmlFor="task-priority" className={LABEL_STYLE}>
              Priority
            </label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className={`${INPUT_BASE} ${priorityColors[priority]}`}
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
          <label htmlFor="task-due-date" className={LABEL_STYLE}>
            Due Date
          </label>
          <input
            id="task-due-date"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={INPUT_BASE}
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className={`w-full flex items-center justify-center gap-2 ${BUTTON_BASE} ${BUTTON_PRIMARY}`}
        >
          <Plus size={20} />
          {isSubmitting ? "Adding..." : "Add Task"}
        </button>
      </div>
    </form>
  );
}

interface CollaboratorManagerProps {
  projectId: number;
  currentCollaborators: Array<{
    user: User;
    permission: "read" | "write";
  }>;
  onAddCollaborator: (
    email: string,
    permission: "read" | "write"
  ) => Promise<void>;
  onRemoveCollaborator: (userId: string) => Promise<void>;
  onUpdatePermission: (
    userId: string,
    permission: "read" | "write"
  ) => Promise<void>;
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
    <div className={`${CARD_BG} rounded-2xl shadow-lg p-8 border border-slate-200`}>
      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-200">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Users size={20} className="text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-slate-900">Collaborators</h3>
      </div>

      {isOwner && (
        <form onSubmit={handleAdd} className="mb-6 space-y-4">
          <div>
            <label htmlFor="collab-email" className={LABEL_STYLE}>
              Add by Email
            </label>
            <input
              id="collab-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className={INPUT_BASE}
              disabled={isAdding}
            />
          </div>

          <div className="flex gap-3">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "read" | "write")}
              className={`${INPUT_BASE} flex-1`}
              disabled={isAdding}
            >
              <option value="read">Can View</option>
              <option value="write">Can Edit</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !email.trim()}
              className={`${BUTTON_BASE} ${BUTTON_PRIMARY}`}
            >
              {isAdding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {currentCollaborators.length === 0 ? (
          <div className="text-center py-8">
            <Users size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No collaborators yet</p>
          </div>
        ) : (
          currentCollaborators.map(({ user, permission: userPermission }) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={40}
                    height={40}
                    className="rounded-full object-cover ring-2 ring-slate-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <select
                      value={userPermission}
                      onChange={(e) =>
                        onUpdatePermission(
                          user.id,
                          e.target.value as "read" | "write"
                        )
                      }
                      className="px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="read">View</option>
                      <option value="write">Edit</option>
                    </select>
                    <button
                      onClick={() => onRemoveCollaborator(user.id)}
                      className={`p-2 ${BUTTON_BASE} ${BUTTON_DANGER}`}
                      title="Remove collaborator"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-2 text-xs font-medium bg-slate-200 text-slate-700 rounded-lg">
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