// src/app/_components/projectManagement.tsx
"use client";

import { useState } from "react";
import { Users, Trash2, Shield, Eye, Edit, Save } from "lucide-react";
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
      className="bg-white rounded-xl shadow-sm border border-[#DDE3E9] p-6"
    >
      <h3 className="text-lg font-bold text-[#222B32] mb-4">New Project</h3>

      <div className="space-y-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Project title"
          className="w-full p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32]"
          disabled={isSubmitting}
          required
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32] resize-none"
          disabled={isSubmitting}
        />

        <div className="flex gap-2">
          <label className="flex-1 flex items-center gap-2 p-3 border-2 border-[#DDE3E9] rounded-lg cursor-pointer hover:border-[#9448F2] transition-all">
            <input
              type="radio"
              value="private"
              checked={shareStatus === "private"}
              onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
              className="text-[#9448F2]"
              disabled={isSubmitting}
            />
            <Shield size={14} className="text-[#59677C]" />
            <span className="text-sm font-medium text-[#222B32]">Private</span>
          </label>
          
          <label className="flex-1 flex items-center gap-2 p-3 border-2 border-[#DDE3E9] rounded-lg cursor-pointer hover:border-[#9448F2] transition-all">
            <input
              type="radio"
              value="shared_read"
              checked={shareStatus === "shared_read"}
              onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
              className="text-[#9448F2]"
              disabled={isSubmitting}
            />
            <Eye size={14} className="text-[#59677C]" />
            <span className="text-sm font-medium text-[#222B32]">View</span>
          </label>
          
          <label className="flex-1 flex items-center gap-2 p-3 border-2 border-[#DDE3E9] rounded-lg cursor-pointer hover:border-[#9448F2] transition-all">
            <input
              type="radio"
              value="shared_write"
              checked={shareStatus === "shared_write"}
              onChange={(e) => setShareStatus(e.target.value as typeof shareStatus)}
              className="text-[#9448F2]"
              disabled={isSubmitting}
            />
            <Edit size={14} className="text-[#59677C]" />
            <span className="text-sm font-medium text-[#222B32]">Edit</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          <Save size={18} />
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

export function CreateTaskForm({ projectId, availableUsers, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    low: "border-[#80C49B] bg-[#80C49B]/10",
    medium: "border-[#FFC53D] bg-[#FFC53D]/10",
    high: "border-orange-500 bg-orange-50",
    urgent: "border-red-500 bg-red-50",
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-[#DDE3E9] p-6">
      <h3 className="text-lg font-bold text-[#222B32] mb-4">New Task</h3>

      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className="w-full p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32]"
          disabled={isSubmitting}
          required
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32] resize-none"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32]"
            disabled={isSubmitting}
          >
            <option value="">Unassigned</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name ?? user.email}
              </option>
            ))}
          </select>

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className={`p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32] ${priorityColors[priority]}`}
            disabled={isSubmitting}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32]"
          disabled={isSubmitting}
        />

        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-xl transition-all disabled:opacity-50"
        >
          <Save size={18} />
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
    <div className="bg-white rounded-xl shadow-sm border border-[#DDE3E9] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={20} className="text-[#9448F2]" />
        <h3 className="text-lg font-bold text-[#222B32]">Team</h3>
      </div>

      {isOwner && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32]"
            disabled={isAdding}
          />

          <div className="flex gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "read" | "write")}
              className="flex-1 p-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] text-[#222B32]"
              disabled={isAdding}
            >
              <option value="read">Can View</option>
              <option value="write">Can Edit</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !email.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isAdding ? "..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {currentCollaborators.length === 0 ? (
          <p className="text-center py-4 text-sm text-[#59677C]">No collaborators yet</p>
        ) : (
          currentCollaborators.map(({ user, permission: userPermission }) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-[#FCFBF9] rounded-lg border border-[#DDE3E9]"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9448F2] to-[#80C49B] flex items-center justify-center text-white font-semibold text-xs">
                    {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#222B32] truncate">
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-[#59677C] truncate">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <select
                      value={userPermission}
                      onChange={(e) => onUpdatePermission(user.id, e.target.value as "read" | "write")}
                      className="px-3 py-1.5 text-sm border border-[#DDE3E9] rounded-lg text-[#222B32] bg-white"
                    >
                      <option value="read">View</option>
                      <option value="write">Edit</option>
                    </select>
                    <button
                      onClick={() => onRemoveCollaborator(user.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1.5 text-xs font-medium bg-[#DDE3E9] text-[#59677C] rounded-lg">
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