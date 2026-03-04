"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "~/trpc/react";
import { Lock, Trash2, Eye, EyeOff, AlertCircle, RefreshCw, KeyRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";
import { cn } from "~/lib/utils";

export function NotesList() {
  const t = useTranslations("create");
  const toast = useToast();

  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
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

  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null);
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingContent, setEditingContent] = useState<Record<number, string>>({});

  const { data: notes, refetch } = api.note.getAll.useQuery();

  const { data: settings } = api.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const keepUnlockedUntilClose = settings?.notesKeepUnlockedUntilClose ?? false;
  const resetPinHint = settings?.resetPinHint ?? null;

  useEffect(() => {
    if (keepUnlockedUntilClose) return;

    // Relock when leaving the page (route change / unmount)
    return () => {
      setUnlockedNotes({});
      setPasswordInputs({});
      setPasswordErrors({});
      setShowPasswords({});
      unlockAttemptsRef.current = {};
      setShowResetPromptModal(null);
      setShowResetModal(null);
      setResetPinInput("");
      setResetPinError(null);
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
    };
  }, [keepUnlockedUntilClose]);

  const deleteNote = api.note.delete.useMutation({
    onSuccess: () => {
      if (selectedNoteId) {
        setSelectedNoteId(null);
      }
      void refetch();
    },
  });

  const updateNote = api.note.update.useMutation({
    onSuccess: () => {
      setSelectedNoteId(null);
      void refetch();
    },
  });

  const verifyPassword = api.note.verifyPassword.useMutation({
    onSuccess: (data, variables) => {
      if (data.valid && data.content) {
        setUnlockedNotes((prev) => ({
          ...prev,
          [variables.noteId]: {
            unlocked: true,
            content: data.content,
          },
        }));
        setPasswordInputs((prev) => ({ ...prev, [variables.noteId]: "" }));
        setPasswordErrors((prev) => ({ ...prev, [variables.noteId]: "" }));
        unlockAttemptsRef.current[variables.noteId] = 0;
      } else {
        const next = (unlockAttemptsRef.current[variables.noteId] ?? 0) + 1;
        unlockAttemptsRef.current[variables.noteId] = next;
        if (next >= 2) setShowResetPromptModal(variables.noteId);

        setPasswordErrors((prev) => ({
          ...prev,
          [variables.noteId]: t("notes.password.incorrect"),
        }));
      }
    },
    onError: (error, variables) => {
      const next = (unlockAttemptsRef.current[variables.noteId] ?? 0) + 1;
      unlockAttemptsRef.current[variables.noteId] = next;
      if (next >= 2) setShowResetPromptModal(variables.noteId);

      setPasswordErrors((prev) => ({
        ...prev,
        [variables.noteId]: error.message ?? t("notes.password.verifyFailed"),
      }));
    },
  });

  const resetPasswordWithPin = api.note.resetPasswordWithPin.useMutation({
    onSuccess: () => {
      setShowResetModal(null);
      setResetPinInput("");
      setResetPinError(null);
      setNewPasswordInput("");
      setConfirmNewPasswordInput("");
    },
    onError: (error) => {
      setResetPinError(error.message);
    },
  });

  const requestDeleteNote = (noteId: number) => {
    if (pendingDeleteNoteId === noteId) {
      if (pendingDeleteTimerRef.current) {
        clearTimeout(pendingDeleteTimerRef.current);
        pendingDeleteTimerRef.current = null;
      }
      setPendingDeleteNoteId(null);
      deleteNote.mutate({ id: noteId });
      return;
    }

    setPendingDeleteNoteId(noteId);
    if (pendingDeleteTimerRef.current) clearTimeout(pendingDeleteTimerRef.current);
    pendingDeleteTimerRef.current = setTimeout(() => setPendingDeleteNoteId(null), 4000);
    // Keep this toast for destructive action confirmation only
    toast.info(t("notes.deleteConfirm"));
  };

  const handlePasswordSubmit = (noteId: number, password: string) => {
    if (password.length === 0) {
      setPasswordErrors((prev) => ({
        ...prev,
        [noteId]: t("notes.password.enter"),
      }));
      return;
    }

    verifyPassword.mutate({ noteId, password });
  };

  const togglePasswordVisibility = (noteId: number) => {
    setShowPasswords((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  const handleResetRequest = (noteId: number) => {
    setShowResetModal(noteId);
    setResetPinInput("");
    setResetPinError(null);
    setNewPasswordInput("");
    setConfirmNewPasswordInput("");
  };

  const openResetPromptAfterFailedUnlock = (noteId: number) => {
    setShowResetPromptModal(noteId);
  };

  const proceedToResetEmailConfirmation = (noteId: number) => {
    setShowResetPromptModal(null);
    setShowResetModal(noteId);
    setResetPinInput("");
    setResetPinError(null);
    setNewPasswordInput("");
    setConfirmNewPasswordInput("");
  };

  const confirmResetRequest = (noteId: number) => {
    if (!resetPinInput.trim()) {
      setResetPinError(t("notes.reset.pinRequired"));
      return;
    }

    if (!newPasswordInput || !confirmNewPasswordInput) {
      setResetPinError(t("notes.reset.passwordRequired"));
      return;
    }

    if (newPasswordInput !== confirmNewPasswordInput) {
      setResetPinError(t("notes.reset.passwordMismatch"));
      return;
    }

    resetPasswordWithPin.mutate({
      noteId,
      resetPin: resetPinInput.trim(),
      newPassword: newPasswordInput,
    });
  };

  const allNotes = notes ?? [];

  // Sticky note accent colors (cycle through them)
  const stickyColors = [
    { bg: "rgb(var(--accent-primary) / 0.12)", border: "rgb(var(--accent-primary) / 0.25)", text: "rgb(var(--accent-primary))" },
    { bg: "rgb(var(--accent-secondary) / 0.12)", border: "rgb(var(--accent-secondary) / 0.25)", text: "rgb(var(--accent-secondary))" },
    { bg: "rgb(var(--accent-tertiary) / 0.15)", border: "rgb(var(--accent-tertiary) / 0.3)", text: "rgb(var(--fg-secondary))" },
    { bg: "rgb(var(--warning) / 0.10)", border: "rgb(var(--warning) / 0.25)", text: "rgb(var(--warning))" },
    { bg: "rgb(var(--info) / 0.10)", border: "rgb(var(--info) / 0.25)", text: "rgb(var(--info))" },
    { bg: "rgb(var(--success) / 0.10)", border: "rgb(var(--success) / 0.25)", text: "rgb(var(--success))" },
  ];

  const closeExpandedNote = useCallback(() => {
    setSelectedNoteId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[17px] font-[590] text-fg-primary leading-[1.235] tracking-[-0.016em]">
            Notes
          </h3>
          {allNotes.length > 0 && (
            <span className="text-[13px] text-fg-tertiary">
              {allNotes.length} {allNotes.length === 1 ? "note" : "notes"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {allNotes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allNotes.map((note, index) => {
                const unlockedState = unlockedNotes[note.id];
                const isLocked = !!note.passwordHash && !unlockedState?.unlocked;
                const rawContent = unlockedState?.content ?? note.content ?? "";
                const titleCandidate = rawContent.split("\n")[0]?.trim();
                const firstLine =
                  titleCandidate && titleCandidate.length > 0
                    ? titleCandidate
                    : rawContent.substring(0, 50);
                const color = stickyColors[index % stickyColors.length]!;

                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => setSelectedNoteId(note.id)}
                    className="group relative aspect-square rounded-xl p-3 text-left transition-all duration-200 hover:scale-[1.04] hover:shadow-lg active:scale-[0.98] cursor-pointer border"
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                    }}
                  >
                    {isLocked && (
                      <Lock
                        size={12}
                        className="absolute top-2 right-2 text-fg-tertiary"
                      />
                    )}
                    <p
                      className="text-[13px] font-medium leading-snug line-clamp-4"
                      style={{ color: color.text }}
                    >
                      {isLocked ? t("notes.encryptedNote") : (firstLine || t("notes.encryptedNote"))}
                    </p>
                    <p className="absolute bottom-2 left-3 text-[10px] text-fg-tertiary">
                      {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-fg-secondary text-[15px]">
              {t("notes.empty")}
            </div>
          )}
        </div>
      </div>

      {/* Expanded note popup */}
      {selectedNoteId !== null && (() => {
        const note = allNotes.find((n) => n.id === selectedNoteId);
        if (!note) return null;
        const unlockedState = unlockedNotes[note.id];
        const isLocked = !!note.passwordHash && !unlockedState?.unlocked;

        return (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_150ms_ease-out]"
            onClick={closeExpandedNote}
          >
            <div
              className="dark:bg-[#16151A] bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-auto p-6 animate-[popIn_200ms_cubic-bezier(0.34,1.56,0.64,1)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] text-fg-tertiary">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={closeExpandedNote}
                  className="p-1.5 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {isLocked ? (
                <LockedNoteContent
                  passwordInput={passwordInputs[note.id] ?? ""}
                  passwordError={passwordErrors[note.id]}
                  showPassword={showPasswords[note.id] ?? false}
                  onPasswordChange={(value) => {
                    setPasswordInputs((prev) => ({ ...prev, [note.id]: value }));
                    if (passwordErrors[note.id]) {
                      setPasswordErrors((prev) => ({ ...prev, [note.id]: "" }));
                    }
                  }}
                  onTogglePasswordVisibility={() => togglePasswordVisibility(note.id)}
                  onSubmit={() => handlePasswordSubmit(note.id, passwordInputs[note.id] ?? "")}
                  onOpenResetPrompt={() => openResetPromptAfterFailedUnlock(note.id)}
                  isSubmitting={verifyPassword.isPending}
                />
              ) : (
                <UnlockedNoteContent
                  value={editingContent[note.id] ?? (unlockedState?.content ?? note.content ?? "")}
                  onChange={(value) => setEditingContent((prev) => ({ ...prev, [note.id]: value }))}
                  onSave={() => {
                    const content = editingContent[note.id] ?? (unlockedState?.content ?? note.content ?? "");
                    updateNote.mutate({ id: note.id, content });
                  }}
                  onRefresh={() => void refetch()}
                  isSaving={updateNote.isPending}
                  onDelete={() => requestDeleteNote(note.id)}
                  isPendingDelete={pendingDeleteNoteId === note.id}
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Reset Prompt Modal (after 2 failed unlock attempts) */}
      {showResetPromptModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-[#16151A] bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-error/10 shadow-sm rounded-lg flex items-center justify-center">
                <AlertCircle className="text-error" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-[590] text-fg-primary">
                  Incorrect password
                </h3>
                <p className="text-[13px] text-fg-secondary mt-0.5">
                  Multiple failed attempts detected
                </p>
              </div>
            </div>

            <p className="text-fg-secondary mb-6 text-[15px] leading-relaxed">
              You entered the wrong password twice. Do you want to reset this note password?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetPromptModal(null)}
                className="flex-1 px-4 py-3.5 dark:border-white/[0.06] border border-slate-200 text-fg-primary hover:bg-bg-tertiary transition-colors rounded-xl text-[17px] font-[590]"
              >
                Try again
              </button>
              <button
                onClick={() =>
                  showResetPromptModal !== null &&
                  proceedToResetEmailConfirmation(showResetPromptModal)
                }
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-[590] rounded-xl hover:shadow-lg transition-all text-[17px]"
              >
                Reset password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal (PIN-based) */}
      {showResetModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="dark:bg-[#16151A] bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-accent-primary/10 shadow-sm rounded-lg flex items-center justify-center">
                <KeyRound className="text-accent-primary" size={20} />
              </div>
              <div>
                <h3 className="text-[17px] font-[590] text-fg-primary">
                  {t("notes.reset.title")}
                </h3>
                <p className="text-[13px] text-fg-secondary mt-0.5">
                  Reset your note password
                </p>
              </div>
            </div>

            <p className="text-fg-secondary mb-4 text-[15px] leading-relaxed">
              {t("notes.reset.descPin")}
            </p>

            <div className="dark:bg-[#1A191E] bg-slate-50 border dark:border-white/[0.06] border-slate-200 rounded-xl p-4 mb-5 space-y-3">
              <div>
                <label className="block text-[13px] font-[590] text-fg-secondary mb-2">
                  {t("notes.reset.pinLabel")}
                </label>
                <input
                  type="password"
                  value={resetPinInput}
                  onChange={(e) => {
                    setResetPinInput(e.target.value);
                    setResetPinError(null);
                  }}
                  placeholder={t("notes.reset.pinPlaceholder")}
                  className="w-full dark:bg-bg-surface/60 bg-slate-100 text-fg-primary text-[15px] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 dark:border-white/[0.06] border border-slate-200"
                />
              </div>
              <div>
                <label className="block text-[13px] font-[590] text-fg-secondary mb-1">
                  {t("notes.reset.hintLabel")}
                </label>
                <p className="text-[13px] text-fg-secondary italic">
                  {resetPinHint ? (
                    <span>{resetPinHint}</span>
                  ) : (
                    <span className="text-fg-tertiary">
                      {t("notes.reset.noHint")}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-[13px] font-[590] text-fg-secondary mb-2">
                  {t("notes.reset.newPasswordLabel")}
                </label>
                <div className="relative">
                  <input
                    type={showNewPasswords ? "text" : "password"}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full dark:bg-bg-surface/60 bg-slate-100 text-fg-primary text-[15px] rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 dark:border-white/[0.06] border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasswords((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary"
                    aria-label={showNewPasswords ? "Hide password" : "Show password"}
                  >
                    {showNewPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-[590] text-fg-secondary mb-2">
                  {t("notes.reset.confirmPasswordLabel")}
                </label>
                <input
                  type={showNewPasswords ? "text" : "password"}
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  className="w-full dark:bg-bg-surface/60 bg-slate-100 text-fg-primary text-[15px] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 dark:border-white/[0.06] border border-slate-200"
                />
              </div>
            </div>

            {resetPinError && (
              <div className="mb-4 text-[13px] text-error flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{resetPinError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResetModal(null);
                  setResetPinInput("");
                  setResetPinError(null);
                }}
                className="flex-1 px-4 py-3.5 border-white/[0.06] text-fg-primary hover:bg-bg-tertiary transition-colors rounded-xl text-[17px] font-[590]"
              >
                {t("notes.actions.cancel")}
              </button>
              <button
                onClick={() =>
                  showResetModal !== null && confirmResetRequest(showResetModal)
                }
                disabled={resetPasswordWithPin.isPending}
                className="flex-1 px-4 py-3.5 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-[590] rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-[17px]"
              >
                {resetPasswordWithPin.isPending
                  ? t("notes.reset.sending")
                  : t("notes.reset.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type LockedNoteContentProps = {
  passwordInput: string;
  passwordError?: string;
  showPassword: boolean;
  onPasswordChange: (value: string) => void;
  onTogglePasswordVisibility: () => void;
  onSubmit: () => void;
  onOpenResetPrompt: () => void;
  isSubmitting: boolean;
};

function LockedNoteContent(props: LockedNoteContentProps) {
  const {
    passwordInput,
    passwordError,
    showPassword,
    onPasswordChange,
    onTogglePasswordVisibility,
    onSubmit,
    onOpenResetPrompt,
    isSubmitting,
  } = props;

  const t = useTranslations("create");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="text-error" size={18} />
        <h3 className="text-[17px] font-[590] text-fg-primary">
          {t("notes.password.protected")}
        </h3>
      </div>
      <p className="text-[15px] text-fg-secondary mb-4 leading-relaxed">
        {t("notes.password.protectedDesc")}
      </p>

      <div className="space-y-3">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={passwordInput}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder={t("notes.password.placeholder")}
            className="w-full dark:bg-bg-surface/60 bg-slate-100 text-fg-primary text-[15px] rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 dark:focus:bg-bg-surface dark:border-white/[0.06] border border-slate-200 shadow-sm transition-all"
          />
          <button
            type="button"
            onClick={onTogglePasswordVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {passwordError && (
          <div className="text-error text-[13px] flex items-center gap-1.5">
            <AlertCircle size={12} />
            {passwordError}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!passwordInput || isSubmitting}
            className="flex-1 bg-gradient-to-r from-accent-primary to-accent-secondary hover:shadow-lg text-white text-[15px] font-[590] py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {isSubmitting
              ? t("notes.password.unlocking")
              : t("notes.password.unlock")}
          </button>
          <button
            type="button"
            onClick={onOpenResetPrompt}
            className="px-4 py-3 rounded-xl border border-white/[0.06] text-fg-secondary hover:bg-bg-tertiary transition-colors text-[15px] font-[590]"
          >
            {t("notes.reset.cta")}
          </button>
        </div>
      </div>
    </div>
  );
}

type UnlockedNoteContentProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onRefresh: () => void;
  isSaving: boolean;
  onDelete: () => void;
  isPendingDelete: boolean;
};

function UnlockedNoteContent(props: UnlockedNoteContentProps) {
  const { value, onChange, onSave, onRefresh, isSaving, onDelete, isPendingDelete } = props;
  const t = useTranslations("create");

  return (
    <div>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <div>
          <span className="text-[17px] font-[590] text-fg-primary">Note Content</span>
          <p className="text-[13px] text-fg-secondary mt-0.5">Edit and save your note</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="p-2 text-fg-tertiary hover:text-fg-primary hover:bg-bg-tertiary/30 transition-colors rounded-lg"
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onDelete}
            className={cn(
              "p-2 transition-colors rounded-lg",
              isPendingDelete
                ? "bg-error/20 text-error"
                : "text-fg-tertiary hover:text-error hover:bg-error/10"
            )}
            aria-label="Delete note"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[200px] bg-bg-surface/40 text-fg-primary rounded-xl p-4 text-[15px] leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-white/[0.06]"
        placeholder={t("notes.placeholders.content")}
      />
      
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-[590] rounded-xl hover:shadow-lg transition-all disabled:opacity-50 text-[15px]"
        >
          {isSaving ? t("notes.edit.saving") : t("notes.edit.save")}
        </button>
      </div>
    </div>
  );
}
