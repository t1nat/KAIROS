"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Lock,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  KeyRound,
  X,
  FolderOpen,
  Users,
  MoreHorizontal,
  Loader2,
  Share2,
  BookOpen,
  StickyNote,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { api } from "~/trpc/react";
import { useToast } from "~/components/providers/ToastProvider";
import { cn } from "~/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TabId = "all" | "notebooks" | "shared";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NotesDashboard() {
  const toast = useToast();
  const utils = api.useUtils();

  // ---- Tab / filter state ----
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotebookId, setSelectedNotebookId] = useState<number | null>(null);

  // ---- Note CRUD state ----
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newNotebookId, setNewNotebookId] = useState<number | null>(null);

  // ---- Password state ----
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [unlockedNotes, setUnlockedNotes] = useState<Record<number, { unlocked: boolean; content: string }>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<number, string>>({});
  const unlockAttemptsRef = useRef<Record<number, number>>({});
  const [showResetPromptModal, setShowResetPromptModal] = useState<number | null>(null);
  const [showResetModal, setShowResetModal] = useState<number | null>(null);
  const [resetPinInput, setResetPinInput] = useState("");
  const [resetPinError, setResetPinError] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState("");
  const [showNewPasswords, setShowNewPasswords] = useState(false);

  // ---- Edit state ----
  const [editingContent, setEditingContent] = useState<Record<number, string>>({});
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null);
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Share modal state ----
  const [shareModalNoteId, setShareModalNoteId] = useState<number | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"read" | "write">("read");

  // ---- Notebook creation state ----
  const [showCreateNotebook, setShowCreateNotebook] = useState(false);
  const [notebookName, setNotebookName] = useState("");

  // ---- Context menu ----
  const [contextMenuNoteId, setContextMenuNoteId] = useState<number | null>(null);

  // ---- Queries ----
  const { data: notes, refetch: refetchNotes } = api.note.getAll.useQuery();
  const { data: sharedNotes } = api.note.getSharedWithMe.useQuery();
  const { data: notebooksList } = api.note.getNotebooks.useQuery();
  const { data: noteSharesList } = api.note.getNoteShares.useQuery(
    { noteId: shareModalNoteId! },
    { enabled: !!shareModalNoteId },
  );
  const { data: settings } = api.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const keepUnlockedUntilClose = settings?.notesKeepUnlockedUntilClose ?? false;
  const resetPinHint = settings?.resetPinHint ?? null;

  useEffect(() => {
    if (keepUnlockedUntilClose) return;
    return () => {
      setUnlockedNotes({});
      setPasswordInputs({});
      setPasswordErrors({});
      setShowPasswords({});
      unlockAttemptsRef.current = {};
    };
  }, [keepUnlockedUntilClose]);

  // ---- Mutations ----
  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      toast.success("Note created");
      setNewTitle(""); setNewContent(""); setNewPassword(""); setNewNotebookId(null);
      setShowCreateForm(false);
      void utils.note.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteNote = api.note.delete.useMutation({
    onSuccess: () => {
      setSelectedNoteId(null);
      void refetchNotes();
    },
  });

  const updateNote = api.note.update.useMutation({
    onSuccess: () => {
      setSelectedNoteId(null);
      void refetchNotes();
    },
  });

  const verifyPassword = api.note.verifyPassword.useMutation({
    onSuccess: (data, variables) => {
      if (data.valid && data.content) {
        setUnlockedNotes((prev) => ({
          ...prev,
          [variables.noteId]: { unlocked: true, content: data.content },
        }));
        setPasswordInputs((prev) => ({ ...prev, [variables.noteId]: "" }));
        setPasswordErrors((prev) => ({ ...prev, [variables.noteId]: "" }));
        unlockAttemptsRef.current[variables.noteId] = 0;
      } else {
        const next = (unlockAttemptsRef.current[variables.noteId] ?? 0) + 1;
        unlockAttemptsRef.current[variables.noteId] = next;
        if (next >= 2) setShowResetPromptModal(variables.noteId);
        setPasswordErrors((prev) => ({ ...prev, [variables.noteId]: "Incorrect password" }));
      }
    },
    onError: (error, variables) => {
      const next = (unlockAttemptsRef.current[variables.noteId] ?? 0) + 1;
      unlockAttemptsRef.current[variables.noteId] = next;
      if (next >= 2) setShowResetPromptModal(variables.noteId);
      setPasswordErrors((prev) => ({ ...prev, [variables.noteId]: error.message }));
    },
  });

  const resetPasswordWithPin = api.note.resetPasswordWithPin.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
      setShowResetModal(null);
      setResetPinInput(""); setResetPinError(null);
      setNewPasswordInput(""); setConfirmNewPasswordInput("");
    },
    onError: (e) => setResetPinError(e.message),
  });

  const shareNote = api.note.shareNote.useMutation({
    onSuccess: () => {
      toast.success("Note shared");
      setShareEmail("");
      void utils.note.getNoteShares.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const unshareNote = api.note.unshareNote.useMutation({
    onSuccess: () => {
      toast.success("Access removed");
      void utils.note.getNoteShares.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createNotebook = api.note.createNotebook.useMutation({
    onSuccess: () => {
      toast.success("Notebook created");
      setNotebookName("");
      setShowCreateNotebook(false);
      void utils.note.getNotebooks.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteNotebook = api.note.deleteNotebook.useMutation({
    onSuccess: () => {
      toast.success("Notebook deleted");
      setSelectedNotebookId(null);
      void utils.note.getNotebooks.invalidate();
      void utils.note.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const moveToNotebook = api.note.moveToNotebook.useMutation({
    onSuccess: () => {
      toast.success("Note moved");
      setContextMenuNoteId(null);
      void utils.note.getAll.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ---- Handlers ----
  const requestDeleteNote = useCallback((noteId: number) => {
    if (pendingDeleteNoteId === noteId) {
      if (pendingDeleteTimerRef.current) clearTimeout(pendingDeleteTimerRef.current);
      pendingDeleteTimerRef.current = null;
      setPendingDeleteNoteId(null);
      deleteNote.mutate({ id: noteId });
      return;
    }
    setPendingDeleteNoteId(noteId);
    if (pendingDeleteTimerRef.current) clearTimeout(pendingDeleteTimerRef.current);
    pendingDeleteTimerRef.current = setTimeout(() => setPendingDeleteNoteId(null), 4000);
    toast.info("Click again to confirm delete");
  }, [pendingDeleteNoteId, deleteNote, toast]);

  const closeExpandedNote = useCallback(() => setSelectedNoteId(null), []);

  // ---- Filtered notes ----
  const allNotes = notes ?? [];
  const filteredNotes = useMemo(() => {
    let result = allNotes;

    if (selectedNotebookId !== null) {
      result = result.filter((n) => n.notebookId === selectedNotebookId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((n) => {
        const title = (n.title ?? "").toLowerCase();
        const content = (n.content ?? "").toLowerCase();
        return title.includes(q) || content.includes(q);
      });
    }

    return result;
  }, [allNotes, selectedNotebookId, searchQuery]);

  // ---- Tabs ----
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "all", label: "All Notes", icon: <StickyNote size={16} />, count: allNotes.length },
    { id: "notebooks", label: "Notebooks", icon: <BookOpen size={16} />, count: notebooksList?.length ?? 0 },
    { id: "shared", label: "Shared", icon: <Users size={16} />, count: sharedNotes?.length ?? 0 },
  ];

  // Time formatter
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* ---- Secondary sidebar ---- */}
      <aside className="w-56 border-r border-white/[0.06] bg-bg-primary flex flex-col p-4 hidden md:flex">
        <nav className="flex flex-col gap-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedNotebookId(null); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                activeTab === tab.id
                  ? "bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary"
                  : "text-fg-tertiary hover:text-fg-primary hover:bg-white/[0.03]"
              )}
            >
              {tab.icon}
              <span className="flex-1">{tab.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-fg-tertiary">
                {tab.count}
              </span>
            </button>
          ))}
        </nav>

        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full kairos-neon-btn text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm mt-4"
        >
          <Plus size={18} />
          New Note
        </button>
      </aside>

      {/* ---- Main content ---- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search + filter bar */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-white/[0.06]">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/30"
            />
          </div>
          {/* Mobile new note button */}
          <button
            onClick={() => setShowCreateForm(true)}
            className="md:hidden kairos-neon-btn text-white rounded-lg p-2.5"
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ---- ALL NOTES TAB ---- */}
          {activeTab === "all" && (
            <div>
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl font-bold text-fg-primary tracking-tight">
                  {selectedNotebookId
                    ? notebooksList?.find((nb) => nb.id === selectedNotebookId)?.name ?? "Notebook"
                    : "Recent Notes"}
                </h2>
                {selectedNotebookId && (
                  <button
                    onClick={() => setSelectedNotebookId(null)}
                    className="text-xs text-accent-primary hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredNotes.map((note) => {
                  const unlockedState = unlockedNotes[note.id];
                  const isLocked = !!note.passwordHash && !unlockedState?.unlocked;
                  const rawContent = unlockedState?.content ?? note.content ?? "";
                  const title = note.title ?? rawContent.split("\n")[0]?.trim().substring(0, 60) ?? "";
                  const preview = rawContent.split("\n").slice(note.title ? 0 : 1).join("\n").trim().substring(0, 120);

                  return (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className="group relative p-5 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-[0_0_20px_rgba(var(--accent-primary),0.12)] border border-white/[0.08] bg-[rgba(var(--accent-primary),0.03)] backdrop-blur-sm hover:bg-[rgba(var(--accent-primary),0.07)] hover:border-[rgba(var(--accent-primary),0.25)]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        {note.shareStatus !== "private" ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[rgba(var(--accent-primary),0.15)] text-accent-primary border border-[rgba(var(--accent-primary),0.2)]">
                            Shared
                          </span>
                        ) : isLocked ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/[0.06] text-fg-tertiary border border-white/[0.08]">
                            <Lock size={9} className="inline mr-1 -mt-px" />Locked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[rgba(var(--accent-secondary),0.12)] text-accent-secondary border border-[rgba(var(--accent-secondary),0.2)]">
                            Note
                          </span>
                        )}
                        <span className="text-xs text-fg-tertiary">{formatTime(note.createdAt)}</span>
                      </div>

                      <h3 className="text-sm font-bold text-fg-primary mb-2 group-hover:text-accent-primary transition-colors line-clamp-1">
                        {isLocked ? "Encrypted Note" : (title || "Untitled")}
                      </h3>

                      <p className="text-fg-tertiary text-xs leading-relaxed mb-5 line-clamp-3">
                        {isLocked ? "This note is password protected" : (preview || "No content")}
                      </p>

                      <div className="flex items-center justify-between">
                        {note.notebookId ? (
                          <div className="flex items-center gap-1.5 text-fg-tertiary">
                            <BookOpen size={12} />
                            <span className="text-[10px]">
                              {notebooksList?.find((nb) => nb.id === note.notebookId)?.name ?? "Notebook"}
                            </span>
                          </div>
                        ) : (
                          <div />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenuNoteId(contextMenuNoteId === note.id ? null : note.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-fg-tertiary hover:text-accent-primary transition-all p-1 rounded"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      {/* Context menu */}
                      {contextMenuNoteId === note.id && (
                        <div
                          className="absolute right-4 bottom-12 z-20 bg-bg-elevated border border-white/[0.08] rounded-xl shadow-xl p-1.5 min-w-[160px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setShareModalNoteId(note.id); setContextMenuNoteId(null); }}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-fg-secondary hover:bg-white/[0.06] hover:text-fg-primary transition"
                          >
                            <Share2 size={13} /> Share
                          </button>
                          {notebooksList && notebooksList.length > 0 && (
                            <div className="border-t border-white/[0.06] my-1" />
                          )}
                          {notebooksList?.map((nb) => (
                            <button
                              key={nb.id}
                              onClick={() => moveToNotebook.mutate({ noteId: note.id, notebookId: nb.id })}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-fg-secondary hover:bg-white/[0.06] hover:text-fg-primary transition"
                            >
                              <FolderOpen size={13} /> Move to {nb.name}
                            </button>
                          ))}
                          {note.notebookId && (
                            <button
                              onClick={() => moveToNotebook.mutate({ noteId: note.id, notebookId: null })}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-fg-tertiary hover:bg-white/[0.06] hover:text-fg-primary transition"
                            >
                              <X size={13} /> Remove from notebook
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Create new note card */}
                <div
                  onClick={() => setShowCreateForm(true)}
                  className="border-2 border-dashed border-white/[0.08] bg-white/[0.01] p-5 rounded-xl flex flex-col items-center justify-center text-fg-tertiary hover:border-accent-primary/30 hover:text-accent-primary transition-all group cursor-pointer min-h-[180px]"
                >
                  <Plus size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-bold">Create new note</p>
                </div>
              </div>
            </div>
          )}

          {/* ---- NOTEBOOKS TAB ---- */}
          {activeTab === "notebooks" && (
            <div>
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl font-bold text-fg-primary tracking-tight">Notebooks</h2>
                <button
                  onClick={() => setShowCreateNotebook(true)}
                  className="flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-secondary transition font-medium"
                >
                  <Plus size={14} /> New Notebook
                </button>
              </div>

              {showCreateNotebook && (
                <div className="mb-6 p-4 rounded-xl border border-accent-primary/20 bg-[rgba(var(--accent-primary),0.03)]">
                  <input
                    type="text"
                    value={notebookName}
                    onChange={(e) => setNotebookName(e.target.value)}
                    placeholder="Notebook name"
                    className="w-full px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30 mb-3"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && notebookName.trim()) createNotebook.mutate({ name: notebookName });
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => notebookName.trim() && createNotebook.mutate({ name: notebookName })}
                      disabled={!notebookName.trim() || createNotebook.isPending}
                      className="flex-1 px-4 py-2 rounded-lg kairos-neon-btn text-white text-sm font-medium disabled:opacity-50"
                    >
                      {createNotebook.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : "Create"}
                    </button>
                    <button
                      onClick={() => setShowCreateNotebook(false)}
                      className="px-4 py-2 rounded-lg border border-white/[0.06] text-fg-secondary text-sm hover:bg-white/[0.04] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {notebooksList?.map((nb) => {
                  const notesInNotebook = allNotes.filter((n) => n.notebookId === nb.id);
                  return (
                    <div
                      key={nb.id}
                      onClick={() => { setActiveTab("all"); setSelectedNotebookId(nb.id); }}
                      className="group relative p-5 rounded-xl cursor-pointer transition-all duration-200 border border-white/[0.08] bg-[rgba(var(--accent-primary),0.03)] backdrop-blur-sm hover:bg-[rgba(var(--accent-primary),0.07)] hover:border-[rgba(var(--accent-primary),0.25)] hover:shadow-[0_0_20px_rgba(var(--accent-primary),0.12)]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-accent-primary/15 flex items-center justify-center">
                          <BookOpen size={18} className="text-accent-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-fg-primary group-hover:text-accent-primary transition-colors truncate">
                            {nb.name}
                          </h3>
                          <p className="text-[10px] text-fg-tertiary">{notesInNotebook.length} notes</p>
                        </div>
                      </div>
                      {nb.description && (
                        <p className="text-xs text-fg-tertiary line-clamp-2 mb-3">{nb.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-fg-tertiary">{formatTime(nb.updatedAt)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete notebook "${nb.name}"? Notes won't be deleted.`)) {
                              deleteNotebook.mutate({ id: nb.id });
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-fg-tertiary hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {(!notebooksList || notebooksList.length === 0) && !showCreateNotebook && (
                  <div
                    onClick={() => setShowCreateNotebook(true)}
                    className="border-2 border-dashed border-white/[0.08] bg-white/[0.01] p-5 rounded-xl flex flex-col items-center justify-center text-fg-tertiary hover:border-accent-primary/30 hover:text-accent-primary transition-all group cursor-pointer min-h-[140px] col-span-full max-w-xs mx-auto"
                  >
                    <BookOpen size={28} className="mb-2 group-hover:scale-110 transition-transform" />
                    <p className="text-sm font-bold">Create your first notebook</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---- SHARED TAB ---- */}
          {activeTab === "shared" && (
            <div>
              <h2 className="text-2xl font-bold text-fg-primary tracking-tight mb-6">Shared with me</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sharedNotes?.map((note) => {
                  const title = note.title ?? (note.content ?? "").split("\n")[0]?.trim().substring(0, 60) ?? "Untitled";
                  const preview = (note.content ?? "").substring(0, 120);

                  return (
                    <div
                      key={note.id}
                      className="group p-5 rounded-xl transition-all duration-200 border border-white/[0.08] bg-[rgba(var(--accent-primary),0.03)] backdrop-blur-sm hover:bg-[rgba(var(--accent-primary),0.07)] hover:border-[rgba(var(--accent-primary),0.25)]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[rgba(var(--accent-primary),0.15)] text-accent-primary border border-[rgba(var(--accent-primary),0.2)]">
                          {note.permission === "write" ? "Can Edit" : "View Only"}
                        </span>
                        <span className="text-xs text-fg-tertiary">{formatTime(note.createdAt)}</span>
                      </div>
                      <h3 className="text-sm font-bold text-fg-primary mb-2 group-hover:text-accent-primary transition-colors line-clamp-1">
                        {note.passwordHash ? "Encrypted Note" : title}
                      </h3>
                      <p className="text-fg-tertiary text-xs leading-relaxed mb-4 line-clamp-3">
                        {note.passwordHash ? "This note is password protected" : (preview || "No content")}
                      </p>
                      <div className="flex items-center gap-2 text-fg-tertiary">
                        <Users size={12} />
                        <span className="text-[10px]">
                          From {note.ownerName ?? note.ownerEmail}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {(!sharedNotes || sharedNotes.length === 0) && (
                  <div className="col-span-full text-center py-16">
                    <Users size={36} className="mx-auto text-fg-tertiary mb-3" />
                    <p className="text-sm text-fg-secondary font-medium">No shared notes yet</p>
                    <p className="text-xs text-fg-tertiary mt-1">Notes shared with you will appear here</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* CREATE NOTE MODAL                                                  */}
      {/* ================================================================== */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-bg-elevated rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-fg-primary">New Note</h3>
              <button onClick={() => setShowCreateForm(false)} className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-white/[0.06] transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full px-4 py-2.5 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                autoFocus
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your note..."
                rows={6}
                className="w-full px-4 py-3 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30 resize-none"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-fg-tertiary font-bold mb-1.5">Password (optional)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Encrypt with password"
                    className="w-full px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                  />
                </div>
                {notebooksList && notebooksList.length > 0 && (
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-wider text-fg-tertiary font-bold mb-1.5">Notebook</label>
                    <select
                      value={newNotebookId ?? ""}
                      onChange={(e) => setNewNotebookId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                    >
                      <option value="">None</option>
                      {notebooksList.map((nb) => (
                        <option key={nb.id} value={nb.id}>{nb.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  if (!newContent.trim()) { toast.info("Content is required"); return; }
                  createNote.mutate({
                    content: newContent,
                    title: newTitle || undefined,
                    password: newPassword || undefined,
                    notebookId: newNotebookId ?? undefined,
                  });
                }}
                disabled={!newContent.trim() || createNote.isPending}
                className="flex-1 kairos-neon-btn text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {createNote.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Note
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-3 rounded-xl border border-white/[0.06] text-fg-secondary text-sm hover:bg-white/[0.04] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* EXPANDED NOTE MODAL                                                */}
      {/* ================================================================== */}
      {selectedNoteId !== null && (() => {
        const note = allNotes.find((n) => n.id === selectedNoteId);
        if (!note) return null;
        const unlockedState = unlockedNotes[note.id];
        const isLocked = !!note.passwordHash && !unlockedState?.unlocked;

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeExpandedNote}>
            <div className="bg-bg-elevated rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto p-6 border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs text-fg-tertiary">{new Date(note.createdAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setShareModalNoteId(note.id); }}
                    className="p-1.5 rounded-lg text-fg-tertiary hover:text-accent-primary hover:bg-accent-primary/10 transition"
                    title="Share"
                  >
                    <Share2 size={15} />
                  </button>
                  <button onClick={closeExpandedNote} className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-white/[0.06] transition">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {isLocked ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="text-red-400" size={18} />
                    <h3 className="text-base font-bold text-fg-primary">Password Protected</h3>
                  </div>
                  <p className="text-sm text-fg-secondary leading-relaxed">
                    This note is encrypted. Enter your password to unlock.
                  </p>
                  <div className="relative">
                    <input
                      type={showPasswords[note.id] ? "text" : "password"}
                      value={passwordInputs[note.id] ?? ""}
                      onChange={(e) => {
                        setPasswordInputs((prev) => ({ ...prev, [note.id]: e.target.value }));
                        if (passwordErrors[note.id]) setPasswordErrors((prev) => ({ ...prev, [note.id]: "" }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") verifyPassword.mutate({ noteId: note.id, password: passwordInputs[note.id] ?? "" });
                      }}
                      placeholder="Enter password"
                      className="w-full bg-bg-primary text-fg-primary text-sm rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-white/[0.06]"
                    />
                    <button
                      onClick={() => setShowPasswords((prev) => ({ ...prev, [note.id]: !prev[note.id] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary"
                    >
                      {showPasswords[note.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors[note.id] && (
                    <div className="text-red-400 text-xs flex items-center gap-1.5">
                      <AlertCircle size={12} /> {passwordErrors[note.id]}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => verifyPassword.mutate({ noteId: note.id, password: passwordInputs[note.id] ?? "" })}
                      disabled={!(passwordInputs[note.id]) || verifyPassword.isPending}
                      className="flex-1 kairos-neon-btn text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50"
                    >
                      {verifyPassword.isPending ? "Unlocking..." : "Unlock"}
                    </button>
                    <button
                      onClick={() => setShowResetPromptModal(note.id)}
                      className="px-4 py-3 rounded-xl border border-white/[0.06] text-fg-secondary text-sm hover:bg-white/[0.04] transition"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                    <span className="text-base font-bold text-fg-primary">
                      {note.title || "Note Content"}
                    </span>
                    <div className="flex gap-1.5">
                      <button onClick={() => void refetchNotes()} className="p-1.5 text-fg-tertiary hover:text-fg-primary hover:bg-white/[0.06] rounded-lg transition">
                        <RefreshCw size={15} />
                      </button>
                      <button
                        onClick={() => requestDeleteNote(note.id)}
                        className={cn("p-1.5 rounded-lg transition", pendingDeleteNoteId === note.id ? "bg-red-500/20 text-red-400" : "text-fg-tertiary hover:text-red-400 hover:bg-red-500/10")}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={editingContent[note.id] ?? (unlockedState?.content ?? note.content ?? "")}
                    onChange={(e) => setEditingContent((prev) => ({ ...prev, [note.id]: e.target.value }))}
                    className="w-full min-h-[200px] bg-bg-primary text-fg-primary rounded-xl p-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-white/[0.06]"
                  />
                  <button
                    onClick={() => {
                      const content = editingContent[note.id] ?? (unlockedState?.content ?? note.content ?? "");
                      updateNote.mutate({ id: note.id, content });
                    }}
                    disabled={updateNote.isPending}
                    className="w-full mt-4 kairos-neon-btn text-white font-bold py-3 rounded-xl disabled:opacity-50 text-sm"
                  >
                    {updateNote.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ================================================================== */}
      {/* SHARE MODAL                                                        */}
      {/* ================================================================== */}
      {shareModalNoteId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShareModalNoteId(null)}>
          <div className="bg-bg-elevated rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-primary/15 flex items-center justify-center">
                  <Share2 size={16} className="text-accent-primary" />
                </div>
                <h3 className="text-base font-bold text-fg-primary">Share Note</h3>
              </div>
              <button onClick={() => setShareModalNoteId(null)} className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-white/[0.06] transition">
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary placeholder:text-fg-tertiary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shareEmail.trim()) {
                    shareNote.mutate({ noteId: shareModalNoteId, email: shareEmail, permission: sharePermission });
                  }
                }}
              />
              <select
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as "read" | "write")}
                className="px-3 py-2 bg-bg-primary rounded-lg text-sm text-fg-primary border border-white/[0.06] focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
              >
                <option value="read">View</option>
                <option value="write">Edit</option>
              </select>
              <button
                onClick={() => shareEmail.trim() && shareNote.mutate({ noteId: shareModalNoteId, email: shareEmail, permission: sharePermission })}
                disabled={!shareEmail.trim() || shareNote.isPending}
                className="px-4 py-2 kairos-neon-btn text-white text-sm font-medium rounded-lg disabled:opacity-50"
              >
                {shareNote.isPending ? <Loader2 size={14} className="animate-spin" /> : "Share"}
              </button>
            </div>

            {/* Current shares */}
            {noteSharesList && noteSharesList.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">Shared with</p>
                {noteSharesList.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-bg-primary/50">
                    <div className="flex items-center gap-2.5">
                      {s.userImage ? (
                        <img src={s.userImage} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-accent-primary/15 flex items-center justify-center text-[10px] font-bold text-accent-primary">
                          {(s.userName ?? s.userEmail)?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-fg-primary font-medium">{s.userName ?? s.userEmail}</p>
                        <p className="text-[10px] text-fg-tertiary capitalize">{s.permission}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => unshareNote.mutate({ noteId: shareModalNoteId!, userId: s.userId })}
                      className="p-1 rounded text-fg-tertiary hover:text-red-400 transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RESET PROMPT MODAL                                                 */}
      {/* ================================================================== */}
      {showResetPromptModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-bg-elevated rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="text-red-400" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg-primary">Incorrect password</h3>
                <p className="text-xs text-fg-secondary">Multiple failed attempts detected</p>
              </div>
            </div>
            <p className="text-sm text-fg-secondary mb-6">Do you want to reset this note&apos;s password?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetPromptModal(null)} className="flex-1 px-4 py-3 border border-white/[0.06] text-fg-primary hover:bg-white/[0.04] rounded-xl text-sm font-bold transition">
                Try again
              </button>
              <button
                onClick={() => {
                  const id = showResetPromptModal;
                  setShowResetPromptModal(null);
                  setShowResetModal(id);
                  setResetPinInput(""); setResetPinError(null);
                  setNewPasswordInput(""); setConfirmNewPasswordInput("");
                }}
                className="flex-1 px-4 py-3 kairos-neon-btn text-white font-bold rounded-xl text-sm"
              >
                Reset password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* RESET MODAL (PIN)                                                  */}
      {/* ================================================================== */}
      {showResetModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-bg-elevated rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/[0.08]">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-accent-primary/10 rounded-lg flex items-center justify-center">
                <KeyRound className="text-accent-primary" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-fg-primary">Reset Note Password</h3>
                <p className="text-xs text-fg-secondary">Enter your secret PIN</p>
              </div>
            </div>

            <div className="bg-bg-primary border border-white/[0.06] rounded-xl p-4 mb-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-fg-secondary mb-1.5">Reset PIN</label>
                <input
                  type="password"
                  value={resetPinInput}
                  onChange={(e) => { setResetPinInput(e.target.value); setResetPinError(null); }}
                  placeholder="Enter your PIN"
                  className="w-full bg-bg-elevated text-fg-primary text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-white/[0.06]"
                />
              </div>
              {resetPinHint && (
                <p className="text-xs text-fg-tertiary italic">Hint: {resetPinHint}</p>
              )}
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-bold text-fg-secondary mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPasswords ? "text" : "password"}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-bg-primary text-fg-primary text-sm rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-white/[0.06]"
                  />
                  <button onClick={() => setShowNewPasswords((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary">
                    {showNewPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-fg-secondary mb-1.5">Confirm Password</label>
                <input
                  type={showNewPasswords ? "text" : "password"}
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  className="w-full bg-bg-primary text-fg-primary text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-white/[0.06]"
                />
              </div>
            </div>

            {resetPinError && (
              <div className="mb-4 text-xs text-red-400 flex items-center gap-1.5">
                <AlertCircle size={12} /> {resetPinError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowResetModal(null); setResetPinInput(""); setResetPinError(null); }}
                className="flex-1 px-4 py-3 border border-white/[0.06] text-fg-primary hover:bg-white/[0.04] rounded-xl text-sm font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!resetPinInput.trim()) { setResetPinError("PIN is required"); return; }
                  if (!newPasswordInput || !confirmNewPasswordInput) { setResetPinError("Password is required"); return; }
                  if (newPasswordInput !== confirmNewPasswordInput) { setResetPinError("Passwords don't match"); return; }
                  resetPasswordWithPin.mutate({ noteId: showResetModal!, resetPin: resetPinInput.trim(), newPassword: newPasswordInput });
                }}
                disabled={resetPasswordWithPin.isPending}
                className="flex-1 px-4 py-3 kairos-neon-btn text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {resetPasswordWithPin.isPending ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away handler for context menus */}
      {contextMenuNoteId !== null && (
        <div className="fixed inset-0 z-10" onClick={() => setContextMenuNoteId(null)} />
      )}
    </div>
  );
}
