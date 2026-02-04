"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Trash2, Eye, EyeOff, AlertCircle, RefreshCw, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-fg-secondary">
              Notes
            </h3>
            <div className="mt-2 h-1 w-14 rounded-full bg-gradient-to-r from-accent-primary/70 to-accent-secondary/50" />
          </div>
          {allNotes.length > 0 && (
            <span className="text-xs text-fg-tertiary">
              {allNotes.length} {allNotes.length === 1 ? "note" : "notes"}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {allNotes.length > 0 ? (
            allNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const unlockedState = unlockedNotes[note.id];
              const isLocked = !!note.passwordHash && !unlockedState?.unlocked;

              const rawContent = unlockedState?.content ?? note.content ?? "";
              const titleCandidate = rawContent.split("\n")[0]?.trim();
              const firstLine =
                titleCandidate && titleCandidate.length > 0
                  ? titleCandidate
                  : rawContent.substring(0, 50);

              return (
                <div key={note.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedNoteId((current) =>
                        current === note.id ? null : note.id,
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedNoteId((current) =>
                          current === note.id ? null : note.id,
                        );
                      }
                    }}
                    className={`w-full text-left p-4 rounded-lg bg-bg-surface/80 transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "shadow-lg shadow-accent-primary/15"
                        : "hover:bg-bg-surface hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-base font-semibold line-clamp-1 ${
                              isSelected
                                ? "text-accent-primary"
                                : "text-fg-primary"
                            }`}
                          >
                            {firstLine || t("notes.encryptedNote")}
                          </h4>
                          {isLocked && (
                            <span className="text-[10px] uppercase tracking-wide text-fg-tertiary border border-border-light/60 rounded-sm px-1.5 py-0.5 bg-bg-elevated/60">
                              {t("notes.password.protected")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteNote(note.id);
                        }}
                        className="p-2 text-fg-quaternary hover:text-error hover:bg-error/10 transition-colors rounded-lg"
                        aria-label="Delete note"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-xs text-fg-tertiary">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>

                    {!isSelected && (
                      <p className="mt-1 text-sm text-fg-tertiary line-clamp-2 leading-relaxed">
                        {isLocked ? t("notes.encryptedNote") : rawContent}
                      </p>
                    )}

                    {isSelected && (
                      <div className="mt-2">
                        {isLocked ? (
                          <LockedNoteContent
                            passwordInput={passwordInputs[note.id] ?? ""}
                            passwordError={passwordErrors[note.id]}
                            showPassword={showPasswords[note.id] ?? false}
                            onPasswordChange={(value) => {
                              setPasswordInputs((prev) => ({
                                ...prev,
                                [note.id]: value,
                              }));
                              if (passwordErrors[note.id]) {
                                setPasswordErrors((prev) => ({
                                  ...prev,
                                  [note.id]: "",
                                }));
                              }
                            }}
                            onTogglePasswordVisibility={() =>
                              togglePasswordVisibility(note.id)
                            }
                            onSubmit={() =>
                              handlePasswordSubmit(
                                note.id,
                                passwordInputs[note.id] ?? "",
                              )
                            }
                            onOpenResetPrompt={() =>
                              openResetPromptAfterFailedUnlock(note.id)
                            }
                            isSubmitting={verifyPassword.isPending}
                          />
                        ) : (
                          <UnlockedNoteContent
                            value={
                              editingContent[note.id] ??
                              (unlockedState?.content ?? note.content ?? "")
                            }
                            onChange={(value) =>
                              setEditingContent((prev) => ({
                                ...prev,
                                [note.id]: value,
                              }))
                            }
                            onSave={() => {
                              const content =
                                editingContent[note.id] ??
                                (unlockedState?.content ?? note.content ?? "");
                              updateNote.mutate({ id: note.id, content });
                            }}
                            onRefresh={() => void refetch()}
                            isSaving={updateNote.isPending}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-fg-secondary text-base">
              {t("notes.empty")}
            </div>
          )}
        </div>
      </div>

      {/* Reset Prompt Modal (after 2 failed unlock attempts) */}
      {showResetPromptModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-base rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-error/10 shadow-sm rounded-lg flex items-center justify-center">
                <AlertCircle className="text-error" size={20} />
              </div>
              <h3 className="text-xl font-bold text-fg-primary">
                Incorrect password
              </h3>
            </div>

            <p className="text-fg-secondary mb-6 text-sm">
              You entered the wrong password twice. Do you want to reset this
              note password?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetPromptModal(null)}
                className="flex-1 px-4 py-3 border-2 border-border-medium/30 text-fg-secondary font-semibold rounded-lg hover:bg-bg-secondary/50 transition-all"
              >
                Try again
              </button>
              <button
                onClick={() =>
                  showResetPromptModal !== null &&
                  proceedToResetEmailConfirmation(showResetPromptModal)
                }
                className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-primary to-success text-white font-semibold rounded-lg hover:shadow-lg transition-all"
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
          <div className="card-base rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent-primary/10 shadow-sm rounded-lg flex items-center justify-center">
                <KeyRound className="text-accent-primary" size={20} />
              </div>
              <h3 className="text-xl font-bold text-fg-primary">
                {t("notes.reset.title")}
              </h3>
            </div>

            <p className="text-fg-secondary mb-4 text-sm">
              {t("notes.reset.descPin")}
            </p>

            <div className="bg-bg-elevated/60 border border-border-medium/40 rounded-lg p-4 mb-4 space-y-2">
              <p className="text-xs text-fg-secondary">
                <span className="font-semibold">
                  {t("notes.reset.pinLabel")}:
                </span>
              </p>
              <input
                type="password"
                value={resetPinInput}
                onChange={(e) => {
                  setResetPinInput(e.target.value);
                  setResetPinError(null);
                }}
                placeholder={t("notes.reset.pinPlaceholder")}
                className="w-full bg-bg-surface/60 text-fg-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-border-light/40"
              />
              <p className="text-xs text-fg-secondary">
                <span className="font-semibold">
                  {t("notes.reset.hintLabel")}:
                </span>{" "}
                {resetPinHint ? (
                  <span className="italic">{resetPinHint}</span>
                ) : (
                  <span className="italic text-fg-tertiary">
                    {t("notes.reset.noHint")}
                  </span>
                )}
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-fg-secondary mb-1">
                  {t("notes.reset.newPasswordLabel")}
                </label>
                <input
                  type={showNewPasswords ? "text" : "password"}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full bg-bg-surface/60 text-fg-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-border-light/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-fg-secondary mb-1">
                  {t("notes.reset.confirmPasswordLabel")}
                </label>
                <input
                  type={showNewPasswords ? "text" : "password"}
                  value={confirmNewPasswordInput}
                  onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                  className="w-full bg-bg-surface/60 text-fg-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-border-light/40"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNewPasswords((v) => !v)}
                className="text-xs text-fg-tertiary hover:text-fg-secondary underline"
              >
                {showNewPasswords
                  ? t("notes.reset.hidePasswords")
                  : t("notes.reset.showPasswords")}
              </button>
            </div>

            {resetPinError && (
              <div className="mb-3 text-xs text-error flex items-center gap-1.5">
                <AlertCircle size={12} />
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
                className="flex-1 px-4 py-3 border-2 border-border-medium/30 text-fg-secondary font-semibold rounded-lg hover:bg-bg-secondary/50 transition-all"
              >
                {t("notes.actions.cancel")}
              </button>
              <button
                onClick={() =>
                  showResetModal !== null && confirmResetRequest(showResetModal)
                }
                disabled={resetPasswordWithPin.isPending}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-primary to-success text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="text-error" size={16} />
        <h3 className="text-base font-semibold text-fg-primary">
          {t("notes.password.protected")}
        </h3>
      </div>
      <p className="text-sm text-fg-secondary mb-2">
        {t("notes.password.protectedDesc")}
      </p>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={passwordInput}
          onChange={(e) => onPasswordChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder={t("notes.password.placeholder")}
          className="w-full bg-bg-surface/60 text-fg-primary text-base rounded-2xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:bg-bg-surface border border-border-light/30 focus:border-accent-primary/50 shadow-sm transition-all"
        />
        <button
          type="button"
          onClick={onTogglePasswordVisibility}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary transition-colors"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        {passwordError ? (
          <div className="text-error text-sm flex items-center gap-1.5">
            <AlertCircle size={12} />
            {passwordError}
          </div>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={onOpenResetPrompt}
          className="text-sm text-accent-primary hover:text-accent-hover underline hover:no-underline"
        >
          {t("notes.reset.cta")}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!passwordInput || isSubmitting}
          className="flex-1 bg-accent-primary hover:bg-accent-hover text-white text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
        >
          {isSubmitting
            ? t("notes.password.unlocking")
            : t("notes.password.unlock")}
        </button>
        <button
          type="button"
          onClick={onOpenResetPrompt}
          className="px-4 py-3 rounded-xl border border-border-medium/30 text-fg-secondary hover:bg-bg-secondary/40 transition-colors text-sm font-semibold"
        >
          Unlock
        </button>
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
};

function UnlockedNoteContent(props: UnlockedNoteContentProps) {
  const { value, onChange, onSave, onRefresh, isSaving } = props;
  const t = useTranslations("create");

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-border-light/30">
        <span className="text-sm font-semibold text-fg-primary">Note</span>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="text-sm px-3 py-1 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-md hover:brightness-[1.02] transition-colors disabled:opacity-50"
          >
            {isSaving ? t("notes.edit.saving") : t("notes.edit.save")}
          </button>
          <button
            onClick={onRefresh}
            className="p-2 text-fg-tertiary hover:text-fg-primary hover:bg-bg-secondary/40 transition-colors rounded-lg"
            aria-label="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[240px] bg-bg-surface/40 text-fg-primary rounded-2xl p-4 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
        placeholder={t("notes.placeholders.content")}
      />
    </div>
  );
}
