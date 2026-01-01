"use client";

import { useState, useEffect } from "react";
import { Trash2, FolderPlus, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { api } from "~/trpc/react";

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
  isExpanded: boolean;
  onToggle: () => void;
}

export function CreateProjectForm({ onSubmit, currentUser, isExpanded, onToggle }: ProjectFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
      await onSubmit({ title, description, shareStatus: "private" });
      setTitle("");
      setDescription("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
            <FolderPlus size={18} className="text-[#A343EC]" />
          </div>
          <span className="text-sm font-semibold text-[#FBF9F5]">New Project</span>
        </div>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 border-t border-white/10 pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
                Project Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter project name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] placeholder:text-[#59677C] transition-all"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
                Description <span className="text-[#59677C] font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your project"
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] placeholder:text-[#59677C] transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full px-6 py-3 border-2 border-[#A343EC] text-[#A343EC] font-semibold rounded-lg hover:bg-[#A343EC] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      )}
    </div>
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
    low: "border-[#80C49B] text-[#80C49B] hover:bg-[#80C49B] hover:text-white",
    medium: "border-[#F8D45E] text-[#F8D45E] hover:bg-[#F8D45E] hover:text-[#181F25]",
    high: "border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white",
    urgent: "border-red-500 text-red-500 hover:bg-red-500 hover:text-white",
  };

  return (
    <form onSubmit={handleSubmit} className="pt-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
          Task Name
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task name"
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] placeholder:text-[#59677C] transition-all"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
          Description <span className="text-[#59677C] font-normal">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about this task"
          rows={2}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] placeholder:text-[#59677C] transition-all resize-none"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
            Assign To
          </label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] transition-all"
            disabled={isSubmitting}
          >
            <option value="">Unassigned</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id} className="bg-[#181F25]">
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className={`w-full px-4 py-3 bg-white/5 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all ${priorityColors[priority]}`}
            disabled={isSubmitting}
          >
            <option value="low" className="bg-[#181F25]">Low</option>
            <option value="medium" className="bg-[#181F25]">Medium</option>
            <option value="high" className="bg-[#181F25]">High</option>
            <option value="urgent" className="bg-[#181F25]">Urgent</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
          Due Date <span className="text-[#59677C] font-normal">(optional)</span>
        </label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] transition-all"
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full px-6 py-3 border-2 border-[#A343EC] text-[#A343EC] font-semibold rounded-lg hover:bg-[#A343EC] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
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
  const [searchedUser, setSearchedUser] = useState<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null>(null);
  const [searchError, setSearchError] = useState("");

  const utils = api.useUtils();

  const isValidEmail = (emailStr: string) => {
    const trimmed = emailStr.trim();
    return trimmed.length > 0 && trimmed.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  };

  const { refetch: searchUser, isFetching: isSearching } = api.user.searchByEmail.useQuery(
    { email: email.trim() },
    {
      enabled: false, 
      retry: false,
    }
  );

  useEffect(() => {
    setSearchedUser(null);
    setSearchError("");

    // Only search if email is valid
    if (isValidEmail(email)) {
      const timer = setTimeout(() => {
        void searchUser().then((result) => {
          if (result.data) {
            setSearchedUser(result.data);
            setSearchError("");
          } else {
            setSearchedUser(null);
            setSearchError("No user found with this email. They need to sign up first!");
          }
        }).catch((error) => {
          console.error("Search error:", error);
          setSearchedUser(null);
          setSearchError("Error searching for user");
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [email, searchUser]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail(email)) {
      setSearchError("Please enter a valid email address");
      return;
    }

    if (!searchedUser) {
      setSearchError("Please wait for user search to complete");
      return;
    }

    setIsAdding(true);
    try {
      await onAddCollaborator(searchedUser.email, permission);
      setEmail("");
      setSearchedUser(null);
      setSearchError("");
      setPermission("read");
      void utils.project.getById.invalidate({ id: projectId });
    } catch (error) {
      console.error("Failed to add collaborator:", error);
      if (error instanceof Error) {
        setSearchError(error.message);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="pt-6 space-y-4">
      {isOwner && (
        <form onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#E4DEEA] mb-2 uppercase tracking-wide">
              Add Team Member
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] placeholder:text-[#59677C] transition-all"
                disabled={isAdding}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#A343EC] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {searchedUser && (
            <div className="flex items-center gap-3 p-3 bg-[#80C49B]/10 border border-[#80C49B]/30 rounded-lg animate-in fade-in slide-in-from-top-1">
              {searchedUser.image ? (
                <Image
                  src={searchedUser.image}
                  alt={searchedUser.name ?? "User"}
                  width={40}
                  height={40}
                  className="rounded-full object-cover ring-2 ring-[#80C49B]/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center text-white font-semibold">
                  {searchedUser.name?.[0]?.toUpperCase() ?? searchedUser.email[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#FBF9F5] truncate">
                  {searchedUser.name ?? "User"}
                </p>
                <p className="text-xs text-[#E4DEAA] truncate">{searchedUser.email}</p>
              </div>
              <CheckCircle2 size={20} className="text-[#80C49B] flex-shrink-0" />
            </div>
          )}

          {searchError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 animate-in fade-in slide-in-from-top-1">
              {searchError}
            </div>
          )}

          <div className="flex gap-2">
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "read" | "write")}
              className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] transition-all"
              disabled={isAdding}
            >
              <option value="read" className="bg-[#181F25]">Can View</option>
              <option value="write" className="bg-[#181F25]">Can Edit</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !searchedUser || isSearching}
              className="px-6 py-3 border-2 border-[#80C49B] text-[#80C49B] font-semibold rounded-lg hover:bg-[#80C49B] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? "..." : "Add"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {currentCollaborators.length === 0 ? (
          <p className="text-center py-6 text-sm text-[#59677C]">No team members yet</p>
        ) : (
          currentCollaborators.map(({ user, permission: userPermission }) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={36}
                    height={36}
                    className="rounded-full object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center text-white font-semibold text-sm">
                    {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#FBF9F5] truncate">
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-[#E4DEEA] truncate">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <select
                      value={userPermission}
                      onChange={(e) => onUpdatePermission(user.id, e.target.value as "read" | "write")}
                      className="px-3 py-2 text-xs border border-white/10 bg-white/5 rounded-lg text-[#FBF9F5] hover:bg-white/10 transition-all"
                    >
                      <option value="read" className="bg-[#181F25]">View</option>
                      <option value="write" className="bg-[#181F25]">Edit</option>
                    </select>
                    <button
                      onClick={() => onRemoveCollaborator(user.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-2 text-xs font-medium bg-white/5 text-[#E4DEAA] rounded-lg border border-white/10">
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