"use client";

import { useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Trash2, Eye, EyeOff, Mail, AlertCircle, ChevronDown, RefreshCw, FolderLock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";

export function NotesList() {
  const t = useTranslations("create");
  const toast = useToast();
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showLockedNotes, setShowLockedNotes] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [unlockedNotes, setUnlockedNotes] = useState<Record<number, { unlocked: boolean; content: string }>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<number, string>>({});
  const [showResetModal, setShowResetModal] = useState<number | null>(null);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<number | null>(null);
  const pendingDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingContent, setEditingContent] = useState<Record<number, string>>({});

  const { data: notes, refetch } = api.note.getAll.useQuery();
  
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
        setUnlockedNotes(prev => ({ 
          ...prev, 
          [variables.noteId]: { 
            unlocked: true, 
            content: data.content 
          } 
        }));
        setPasswordInputs(prev => ({ ...prev, [variables.noteId]: '' }));
        setPasswordErrors(prev => ({ ...prev, [variables.noteId]: '' }));
      } else {
        setPasswordErrors(prev => ({ 
          ...prev, 
          [variables.noteId]: t("notes.password.incorrect") 
        }));
      }
    },
    onError: (error, variables) => {
      setPasswordErrors(prev => ({ 
        ...prev, 
        [variables.noteId]: error.message ?? t("notes.password.verifyFailed") 
      }));
    },
  });

  const requestPasswordReset = api.note.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success(t("notes.reset.success"));
      setShowResetModal(null);
    },
    onError: (error) => {
      toast.error(t("errors.generic", { message: error.message }));
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
    toast.info(t("notes.deleteConfirm"));
  };

  const handlePasswordSubmit = (noteId: number, password: string) => {
    if (password.length === 0) {
      setPasswordErrors(prev => ({ 
        ...prev, 
        [noteId]: t("notes.password.enter") 
      }));
      return;
    }
    
    verifyPassword.mutate({ noteId, password });
  };

  const togglePasswordVisibility = (noteId: number) => {
    setShowPasswords(prev => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  const handleResetRequest = (noteId: number) => {
    setShowResetModal(noteId);
  };

  const confirmResetRequest = (noteId: number) => {
    requestPasswordReset.mutate({ noteId });
  };

  // Separate notes into locked and unlocked
  const unlockedNotesArray = notes?.filter(n => !n.passwordHash) ?? [];
  const lockedNotesArray = notes?.filter(n => n.passwordHash) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Notes List - Right Side */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-fg-secondary">
              Notes
            </h3>
            <div className="mt-2 h-1 w-14 rounded-full bg-gradient-to-r from-accent-primary/70 to-accent-secondary/50" />
          </div>
          {lockedNotesArray.length > 0 && (
            <button
              onClick={() => setShowLockedNotes((s) => !s)}
              className="flex items-center gap-1.5 text-sm text-fg-secondary hover:text-accent-primary transition-colors"
            >
              <FolderLock size={16} />
              <span className="font-medium">{lockedNotesArray.length}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${showLockedNotes ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {unlockedNotesArray.length > 0 ? (
             unlockedNotesArray.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const unlockedContent = unlockedNotes[note.id]?.content;
              const displayContent = unlockedContent ?? note.content;
              const firstLine = displayContent.split('\\n')[0]?.trim() ?? displayContent.substring(0, 50);

              return (
                <div key={note.id}>
                  <div
                    onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNoteId(isSelected ? null : note.id);
                      }
                    }}
                    className={`w-full text-left p-5 rounded-2xl transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-bg-elevated/80 shadow-2xl shadow-accent-primary/15'
                        : 'bg-bg-surface/55 shadow-md hover:shadow-xl hover:bg-bg-surface/70'
                    }`}
                  >
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-accent-primary/70 via-accent-secondary/50 to-success/30 opacity-80" />

                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h4 className={`text-lg font-bold line-clamp-1 flex-1 ${
                        isSelected ? 'text-accent-primary' : 'text-fg-primary'
                      }`}>
                        {firstLine}
                      </h4>
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

                    <p className="text-sm text-fg-secondary">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>

                    {!isSelected ? (
                      <p className="mt-2 text-base text-fg-tertiary line-clamp-3 leading-relaxed">
                        {displayContent}
                      </p>
                    ) : (
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-sm font-semibold text-fg-primary">Edit</span>
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const content = editingContent[note.id] ?? displayContent;
                                updateNote.mutate({ id: note.id, content });
                              }}
                              disabled={updateNote.isPending}
                              className="text-sm px-3 py-1 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-md hover:brightness-[1.02] transition-colors disabled:opacity-50"
                            >
                              {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void refetch();
                              }}
                              className="p-2 text-fg-tertiary hover:text-fg-primary hover:bg-bg-secondary/40 transition-colors rounded-lg"
                              aria-label="Refresh"
                            >
                              <RefreshCw size={14} />
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={editingContent[note.id] ?? displayContent}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                          className="w-full min-h-[240px] bg-bg-surface/40 text-fg-primary rounded-2xl p-4 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                          placeholder={t("notes.placeholders.content")}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            lockedNotesArray.length === 0 && (
              <div className="text-center py-8 text-fg-secondary text-base">
                {t("notes.empty")}
              </div>
            )
          )}

          {/* Locked Notes Section */}
          {showLockedNotes && lockedNotesArray.length > 0 && (
            <div className="pt-6 mt-4">
              <h4 className="text-sm font-semibold text-fg-secondary mb-3">
                {t("notes.password.sectionTitle")}
              </h4>
              {lockedNotesArray.map((note) => {
                const isSelected = selectedNoteId === note.id;
                const isLocked = !unlockedNotes[note.id]?.unlocked;
                const showPassword = showPasswords[note.id] ?? false;
                const passwordInput = passwordInputs[note.id] ?? '';
                const passwordError = passwordErrors[note.id];
                const unlockedContent = unlockedNotes[note.id]?.content;

                return (
                  <div key={note.id} className="space-y-2">
                    <button
                      onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                      className={`w-full text-left p-3 rounded-2xl transition-all ${
                        isSelected
                          ? 'bg-error/8 shadow-lg shadow-error/10'
                          : 'bg-bg-surface/55 shadow-sm hover:shadow-md hover:bg-bg-surface/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1">
                          <Lock size={16} className="text-error flex-shrink-0" />
                          <h4 className="text-base font-semibold text-fg-primary line-clamp-1">
                            {t("notes.encryptedNote")}
                          </h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteNote(note.id);
                          }}
                          className="p-2 text-fg-quaternary hover:text-error hover:bg-error/10 transition-colors rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-fg-secondary">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </button>

                    {/* EXPANDED CONTENT FOR LOCKED NOTES */}
                    {isSelected && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-3 p-4 rounded-2xl bg-bg-elevated/60 shadow-md">
                        {isLocked ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Lock className="text-error" size={16} />
                              <h3 className="text-base font-semibold text-fg-primary">{t("notes.password.protected")}</h3>
                            </div>
                            <p className="text-sm text-fg-secondary mb-3">{t("notes.password.protectedDesc")}</p>
                            
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                value={passwordInput}
                                onChange={(e) => {
                                  setPasswordInputs(prev => ({ ...prev, [note.id]: e.target.value }));
                                  if (passwordError) setPasswordErrors(prev => ({ ...prev, [note.id]: '' }));
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit(note.id, passwordInput)}
                                placeholder={t("notes.password.placeholder")}
                                className="w-full bg-bg-elevated/40 text-fg-primary text-base rounded-2xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(note.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary"
                              >
                                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>

                            {passwordError && (
                              <div className="text-error text-sm flex items-center gap-1.5">
                                <AlertCircle size={12} />
                                {passwordError}
                                <button onClick={() => handleResetRequest(note.id)} className="underline hover:no-underline">{t("notes.reset.cta")}</button>
                              </div>
                            )}

                            <button
                              onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                              disabled={!passwordInput || verifyPassword.isPending}
                              className="w-full bg-accent-primary hover:bg-accent-hover text-white text-sm font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
                            >
                              {verifyPassword.isPending ? t("notes.password.unlocking") : t("notes.password.unlock")}
                            </button>
                          </div>
                        ) : (
                          /* UNLOCKED CONTENT */
                          <div>
                            <div className="flex items-center justify-between mb-3 pb-3">
                              <span className="text-sm font-semibold text-fg-primary">Note</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const content = editingContent[note.id] ?? (unlockedContent ?? note.content);
                                    updateNote.mutate({ id: note.id, content });
                                  }}
                                  disabled={updateNote.isPending}
                                  className="text-sm px-3 py-1 bg-gradient-to-r from-accent-primary to-accent-secondary text-white rounded-md hover:brightness-[1.02] transition-colors disabled:opacity-50"
                                >
                                  {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                                </button>
                                <button
                                  onClick={() => void refetch()}
                                  className="p-2 text-fg-tertiary hover:text-fg-primary hover:bg-bg-secondary/40 transition-colors rounded-lg"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              </div>
                            </div>
                            <textarea
                              value={editingContent[note.id] ?? (unlockedContent ?? note.content)}
                              onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                              className="w-full min-h-[240px] bg-bg-surface/40 text-fg-primary rounded-2xl p-4 text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30"
                              placeholder={t("notes.placeholders.content")}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card-base rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent-primary/10 shadow-sm rounded-lg flex items-center justify-center">
                <Mail className="text-accent-primary" size={20} />
              </div>
              <h3 className="text-xl font-bold text-fg-primary">{t("notes.reset.title")}</h3>
            </div>
            
            <p className="text-fg-secondary mb-6 text-sm">
              {t("notes.reset.desc")}
            </p>

            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-warning mt-0.5" />
                <p className="text-xs text-fg-secondary">
                  {t("notes.reset.expiry")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(null)}
                className="flex-1 px-4 py-3 border-2 border-border-medium/30 text-fg-secondary font-semibold rounded-lg hover:bg-bg-secondary/50 transition-all"
              >
                {t("notes.actions.cancel")}
              </button>
              <button
                onClick={() => confirmResetRequest(showResetModal)}
                disabled={requestPasswordReset.isPending}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-accent-primary to-success text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestPasswordReset.isPending ? t("notes.reset.sending") : t("notes.reset.send")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}