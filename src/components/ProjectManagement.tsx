"use client";

import { useState, useEffect } from "react";
import { Trash2, FolderPlus, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/ToastProvider";

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
  const t = useTranslations("create");
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  void currentUser;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.info(t("projectForm.validation.projectTitleRequired"));
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
    <div className="surface-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-elevated transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent-primary/10 border border-accent-primary/20 rounded-lg flex items-center justify-center">
            <FolderPlus size={18} className="text-accent-primary" />
          </div>
          <span className="text-sm font-semibold text-fg-primary">{t("projectForm.title")}</span>
        </div>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 border-t border-border-light/30 pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
                {t("projectForm.projectName")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("projectForm.projectNamePlaceholder")}
                className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary placeholder:text-fg-tertiary transition-all"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
                {t("common.description")} <span className="text-fg-tertiary font-normal">({t("common.optional")})</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("projectForm.descriptionPlaceholder")}
                rows={3}
                className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary placeholder:text-fg-tertiary transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full px-6 py-3 bg-accent-primary text-white font-semibold rounded-lg hover:bg-accent-hover transition-all border border-accent-primary/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("projectForm.creating") : t("projectForm.create")}
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
  const t = useTranslations("create");
  const toast = useToast();
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
      toast.info(t("taskForm.validation.taskTitleRequired"));
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
    low: "border-success/60 text-success hover:bg-success hover:text-white",
    medium: "border-warning/60 text-warning hover:bg-warning hover:text-bg-primary",
    high: "border-orange-500/60 text-orange-400 hover:bg-orange-500 hover:text-white",
    urgent: "border-error/60 text-error hover:bg-error hover:text-white",
  };

  return (
    <form onSubmit={handleSubmit} className="pt-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
          {t("taskForm.taskName")}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("taskForm.taskNamePlaceholder")}
          className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary placeholder:text-fg-tertiary transition-all"
          disabled={isSubmitting}
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
          {t("common.description")} <span className="text-fg-tertiary font-normal">({t("common.optional")})</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("taskForm.descriptionPlaceholder")}
          rows={2}
          className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary placeholder:text-fg-tertiary transition-all resize-none"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
            {t("taskForm.assignTo")}
          </label>
          <select
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
            className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary transition-all"
            disabled={isSubmitting}
          >
            <option value="">{t("taskForm.unassigned")}</option>
            {availableUsers.map((user) => (
              <option key={user.id} value={user.id} className="bg-bg-secondary text-fg-primary">
                {user.name ?? user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
            {t("taskForm.priority")}
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className={`w-full px-4 py-3 bg-bg-surface/60 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all ${priorityColors[priority]}`}
            disabled={isSubmitting}
          >
            <option value="low" className="bg-bg-secondary text-fg-primary">{t("taskForm.priorityLow")}</option>
            <option value="medium" className="bg-bg-secondary text-fg-primary">{t("taskForm.priorityMedium")}</option>
            <option value="high" className="bg-bg-secondary text-fg-primary">{t("taskForm.priorityHigh")}</option>
            <option value="urgent" className="bg-bg-secondary text-fg-primary">{t("taskForm.priorityUrgent")}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
          {t("taskForm.dueDate")} <span className="text-fg-tertiary font-normal">({t("common.optional")})</span>
        </label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary transition-all"
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full px-6 py-3 border border-accent-primary/60 text-accent-primary font-semibold rounded-lg hover:bg-accent-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? t("taskForm.adding") : t("taskForm.add")}
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
  const t = useTranslations("create");
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
            setSearchError(t("team.search.noUser"));
          }
        }).catch((error) => {
          console.error("Search error:", error);
          setSearchedUser(null);
          setSearchError(t("team.search.error"));
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [email, searchUser, t]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidEmail(email)) {
      setSearchError(t("team.search.invalidEmail"));
      return;
    }

    if (!searchedUser) {
      setSearchError(t("team.search.wait"));
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
            <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
              {t("team.addMember")}
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("team.emailPlaceholder")}
                className="w-full px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary placeholder:text-fg-tertiary transition-all"
                disabled={isAdding}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          {searchedUser && (
            <div className="flex items-center gap-3 p-3 bg-success/10 border border-success/30 rounded-lg animate-in fade-in slide-in-from-top-1">
              {searchedUser.image ? (
                <Image
                  src={searchedUser.image}
                  alt={searchedUser.name ?? "User"}
                  width={40}
                  height={40}
                  className="rounded-full object-cover ring-2 ring-success/30"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-semibold">
                  {searchedUser.name?.[0]?.toUpperCase() ?? searchedUser.email[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg-primary truncate">
                  {searchedUser.name ?? t("team.unknownUser")}
                </p>
                <p className="text-xs text-fg-secondary truncate">{searchedUser.email}</p>
              </div>
              <CheckCircle2 size={20} className="text-success flex-shrink-0" />
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
              className="flex-1 px-4 py-3 bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 text-fg-primary transition-all"
              disabled={isAdding}
            >
              <option value="read" className="bg-bg-secondary text-fg-primary">{t("team.canView")}</option>
              <option value="write" className="bg-bg-secondary text-fg-primary">{t("team.canEdit")}</option>
            </select>

            <button
              type="submit"
              disabled={isAdding || !searchedUser || isSearching}
              className="px-6 py-3 border border-success/60 text-success font-semibold rounded-lg hover:bg-success hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? t("team.adding") : t("team.add")}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {currentCollaborators.length === 0 ? (
          <p className="text-center py-6 text-sm text-fg-tertiary">{t("team.empty")}</p>
        ) : (
          currentCollaborators.map(({ user, permission: userPermission }) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 bg-bg-surface/50 rounded-lg border border-border-light/30 hover:bg-bg-elevated transition-all"
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
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-semibold text-sm">
                    {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-primary truncate">
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-xs text-fg-secondary truncate">{user.email}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isOwner ? (
                  <>
                    <select
                      value={userPermission}
                      onChange={(e) => onUpdatePermission(user.id, e.target.value as "read" | "write")}
                      className="px-3 py-2 text-xs border border-border-light/30 bg-bg-surface/50 rounded-lg text-fg-primary hover:bg-bg-elevated transition-all"
                    >
                      <option value="read" className="bg-bg-secondary text-fg-primary">{t("team.view")}</option>
                      <option value="write" className="bg-bg-secondary text-fg-primary">{t("team.edit")}</option>
                    </select>
                    <button
                      onClick={() => onRemoveCollaborator(user.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title={t("team.remove")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-2 text-xs font-medium bg-bg-surface/50 text-fg-secondary rounded-lg border border-border-light/30">
                    {userPermission === "read" ? t("team.view") : t("team.edit")}
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