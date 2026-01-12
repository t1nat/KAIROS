"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, FolderPlus, CheckCircle2, Plus, Loader2, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";
import Image from "next/image";
import { api } from "~/trpc/react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";

type Translator = (key: string, values?: Record<string, unknown>) => string;

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
  projectId?: number;
  onAddCollaborator?: (email: string, permission: "read" | "write") => Promise<void>;
  currentCollaborators?: Array<{
    user: User;
    permission: "read" | "write";
  }>;
  onRemoveCollaborator?: (userId: string) => Promise<void>;
  onUpdatePermission?: (userId: string, permission: "read" | "write") => Promise<void>;
  isOwner?: boolean;
}

export function CreateProjectForm({ 
  onSubmit, 
  currentUser, 
  isExpanded, 
  onToggle,
  projectId,
  onAddCollaborator,
  currentCollaborators = [],
  onRemoveCollaborator,
  onUpdatePermission,
  isOwner = true
}: ProjectFormProps) {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("create");
  const toast = useToast();
  const utils = api.useUtils();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  void currentUser;

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

    if (isValidEmail(email) && projectId) {
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
  }, [email, searchUser, t, projectId]);

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

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!onAddCollaborator || !projectId) return;
    
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
    <div className="rounded-2xl bg-bg-surface/50 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-lg flex items-center justify-center shadow-sm">
            <FolderPlus size={18} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-fg-primary">{t("projectForm.title")}</span>
        </div>
        {isExpanded ? <ChevronUp size={18} className="text-fg-tertiary" /> : <ChevronDown size={18} className="text-fg-tertiary" />}
      </button>

      {isExpanded && (
        <div className="px-5 pb-5 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-2">
                {t("projectForm.projectName")}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("projectForm.projectNamePlaceholder")}
                className="w-full px-4 py-3 bg-bg-elevated/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary transition-all"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-2">
                {t("common.description")} <span className="text-fg-tertiary font-normal">({t("common.optional")})</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("projectForm.descriptionPlaceholder")}
                rows={3}
                className="w-full px-4 py-3 bg-bg-elevated/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary transition-all resize-none"
                disabled={isSubmitting}
              />
            </div>

            {!projectId && (
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {t("projectForm.creating")}
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {t("projectForm.create")}
                  </>
                )}
              </button>
            )}
          </form>

          {projectId && isOwner && onAddCollaborator && (
            <div className="mt-6 pt-6">
              <h3 className="text-sm font-semibold text-fg-primary mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                {t("team.title")}
              </h3>
              
              <form onSubmit={handleAddCollaborator} className="space-y-3 mb-4">
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
                      className="w-full px-4 py-3 bg-bg-surface/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary transition-all"
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
                  <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg animate-in fade-in slide-in-from-top-1">
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
                  <div className="p-3 bg-error/10 rounded-lg text-sm text-error animate-in fade-in slide-in-from-top-1">
                    {searchError}
                  </div>
                )}

                <div className="flex gap-2">
                  <select
                    value={permission}
                    onChange={(e) => setPermission(e.target.value as "read" | "write")}
                    className="flex-1 px-4 py-3 bg-bg-surface/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary transition-all"
                    disabled={isAdding}
                  >
                    <option value="read" className="bg-bg-secondary text-fg-primary">{t("team.canView")}</option>
                    <option value="write" className="bg-bg-secondary text-fg-primary">{t("team.canEdit")}</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isAdding || !searchedUser || isSearching}
                    className="px-6 py-3 bg-success text-white font-semibold rounded-lg hover:bg-success/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-success/20"
                  >
                    {isAdding ? t("team.adding") : t("team.add")}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {currentCollaborators.length === 0 ? (
                  <p className="text-center py-4 text-sm text-fg-tertiary">{t("team.empty")}</p>
                ) : (
                  currentCollaborators.map(({ user, permission: userPermission }) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-bg-surface/50 rounded-lg ios-card hover:bg-bg-elevated transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {user.image ? (
                          <Image
                            src={user.image}
                            alt={user.name ?? "User"}
                            width={32}
                            height={32}
                            className="rounded-full object-cover ring-2 ring-white/10"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white font-semibold text-xs">
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
                        {isOwner && onUpdatePermission && onRemoveCollaborator ? (
                          <>
                            <select
                              value={userPermission}
                              onChange={(e) => onUpdatePermission(user.id, e.target.value as "read" | "write")}
                              className="px-3 py-1.5 text-xs shadow-sm bg-bg-surface/50 rounded-lg text-fg-primary hover:bg-bg-elevated transition-all"
                            >
                              <option value="read" className="bg-bg-secondary text-fg-primary">{t("team.view")}</option>
                              <option value="write" className="bg-bg-secondary text-fg-primary">{t("team.edit")}</option>
                            </select>
                            <button
                              onClick={() => onRemoveCollaborator(user.id)}
                              className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                              title={t("team.remove")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1.5 text-xs font-medium bg-bg-surface/50 text-fg-secondary rounded-lg shadow-sm">
                            {userPermission === "read" ? t("team.view") : t("team.edit")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
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
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("create");
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);

  void projectId;

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false);
      }
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setShowPriorityDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const priorityConfig = {
    low: { color: "bg-success/20 text-success", dot: "bg-success" },
    medium: { color: "bg-warning/20 text-warning", dot: "bg-warning" },
    high: { color: "bg-orange-500/20 text-orange-400", dot: "bg-orange-500" },
    urgent: { color: "bg-error/20 text-error", dot: "bg-error" },
  };

  const getSelectedUser = () => {
    if (!assignedToId) return null;
    return availableUsers.find(u => u.id === assignedToId);
  };

  const selectedUser = getSelectedUser();

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
          className="w-full px-4 py-3 bg-bg-surface/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary transition-all"
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
          className="w-full px-4 py-3 bg-bg-surface/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary transition-all resize-none"
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Assign To Dropdown */}
        <div ref={assignDropdownRef} className="relative">
          <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
            {t("taskForm.assignTo")}
          </label>
          <button
            type="button"
            onClick={() => !isSubmitting && setShowAssignDropdown(!showAssignDropdown)}
            className="w-full px-4 py-3 bg-bg-surface/60 rounded-lg text-left flex items-center justify-between hover:bg-bg-elevated transition-all disabled:opacity-50"
            disabled={isSubmitting}
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedUser ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {selectedUser.name?.[0]?.toUpperCase() ?? selectedUser.email?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-fg-primary truncate text-sm">{selectedUser.name ?? selectedUser.email}</span>
                </>
              ) : (
                <span className="text-fg-tertiary text-sm">{t("taskForm.unassigned")}</span>
              )}
            </div>
            <ChevronDown size={16} className={`text-fg-tertiary transition-transform ${showAssignDropdown ? "rotate-180" : ""}`} />
          </button>
          
          {showAssignDropdown && (
            <div className="absolute z-50 w-full mt-2 py-2 bg-bg-secondary/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2 max-h-48 overflow-y-auto">
              <button
                type="button"
                onClick={() => { setAssignedToId(""); setShowAssignDropdown(false); }}
                className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-bg-elevated transition-colors ${!assignedToId ? "bg-accent-primary/10" : ""}`}
              >
                <div className="w-6 h-6 rounded-full bg-bg-surface/60 flex items-center justify-center">
                  <UserIcon size={12} className="text-fg-tertiary" />
                </div>
                <span className="text-sm text-fg-secondary">{t("taskForm.unassigned")}</span>
              </button>
              {availableUsers.map((user) => (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => { setAssignedToId(user.id); setShowAssignDropdown(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-bg-elevated transition-colors ${assignedToId === user.id ? "bg-accent-primary/10" : ""}`}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-semibold">
                    {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm text-fg-primary truncate">{user.name ?? user.email}</span>
                  {assignedToId === user.id && <CheckCircle2 size={14} className="text-accent-primary ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Dropdown */}
        <div ref={priorityDropdownRef} className="relative">
          <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
            {t("taskForm.priority")}
          </label>
          <button
            type="button"
            onClick={() => !isSubmitting && setShowPriorityDropdown(!showPriorityDropdown)}
            className="w-full px-4 py-3 bg-bg-surface/60 rounded-lg text-left flex items-center justify-between hover:bg-bg-elevated transition-all disabled:opacity-50"
            disabled={isSubmitting}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${priorityConfig[priority].dot}`} />
              <span className={`text-sm font-medium ${priorityConfig[priority].color.split(" ")[1]}`}>
                {t(`taskForm.priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`)}
              </span>
            </div>
            <ChevronDown size={16} className={`text-fg-tertiary transition-transform ${showPriorityDropdown ? "rotate-180" : ""}`} />
          </button>
          
          {showPriorityDropdown && (
            <div className="absolute z-50 w-full mt-2 py-2 bg-bg-secondary/95 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 animate-in fade-in slide-in-from-top-2">
              {(["low", "medium", "high", "urgent"] as const).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => { setPriority(p); setShowPriorityDropdown(false); }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-bg-elevated transition-colors ${priority === p ? "bg-accent-primary/10" : ""}`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${priorityConfig[p].dot}`} />
                  <span className={`text-sm font-medium ${priorityConfig[p].color.split(" ")[1]}`}>
                    {t(`taskForm.priority${p.charAt(0).toUpperCase() + p.slice(1)}`)}
                  </span>
                  {priority === p && <CheckCircle2 size={14} className="text-accent-primary ml-auto" />}
                </button>
              ))}
            </div>
          )}
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
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <span className="relative z-10 flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              {t("taskForm.adding")}
            </>
          ) : (
            <>
              <Plus size={18} />
              {t("taskForm.add")}
            </>
          )}
        </span>
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
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("create");
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
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error animate-in fade-in slide-in-from-top-1">
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
              className="px-6 py-3 bg-success text-white font-semibold rounded-lg hover:bg-success/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-success/20"
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
              className="flex items-center justify-between p-4 bg-bg-surface/50 rounded-lg ios-card hover:bg-bg-elevated transition-all"
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
                      className="px-3 py-2 text-xs shadow-sm bg-bg-surface/50 rounded-lg text-fg-primary hover:bg-bg-elevated transition-all"
                    >
                      <option value="read" className="bg-bg-secondary text-fg-primary">{t("team.view")}</option>
                      <option value="write" className="bg-bg-secondary text-fg-primary">{t("team.edit")}</option>
                    </select>
                    <button
                      onClick={() => onRemoveCollaborator(user.id)}
                      className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      title={t("team.remove")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-2 text-xs font-medium bg-bg-surface/50 text-fg-secondary rounded-lg shadow-sm">
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