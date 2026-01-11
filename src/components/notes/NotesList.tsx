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
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary">
            {t("notes.title")}
          </h3>
          {lockedNotesArray.length > 0 && (
            <button
              onClick={() => setShowLockedNotes((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-fg-tertiary hover:text-accent-primary transition-colors"
            >
              <FolderLock size={14} />
              <span>{lockedNotesArray.length}</span>
              <ChevronDown 
                size={12} 
                className={`transition-transform ${showLockedNotes ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {unlockedNotesArray.length > 0 ? (
             unlockedNotesArray.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const unlockedContent = unlockedNotes[note.id]?.content;
              const displayContent = unlockedContent ?? note.content;
              const firstLine = displayContent.split('\\n')[0]?.trim() ?? displayContent.substring(0, 50);

              return (
                <div key={note.id} className="space-y-2">
                  <button
                    onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected 
                        ? 'bg-accent-primary/10 border-accent-primary/30' 
                        : 'bg-bg-surface/50 border-border-light/20 hover:bg-bg-surface hover:border-border-light/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className={`text-sm font-semibold line-clamp-1 flex-1 ${
                        isSelected ? 'text-accent-primary' : 'text-fg-primary'
                      }`}>
                        {firstLine}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteNote(note.id);
                        }}
                        className="p-1 text-fg-quaternary hover:text-error transition-colors rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-fg-tertiary">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </button>

                  {/* EXPANDED CONTENT */}
                  {isSelected && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 p-4 bg-bg-surface/30 border border-border-light/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-light/20">
                        <span className="text-xs font-medium text-fg-tertiary">Edit Note</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const content = editingContent[note.id] ?? displayContent;
                              updateNote.mutate({ id: note.id, content });
                            }}
                            disabled={updateNote.isPending}
                            className="text-xs px-3 py-1 bg-accent-primary text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
                          >
                            {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                          </button>
                          <button
                            onClick={() => void refetch()}
                            className="p-1 text-fg-tertiary hover:text-fg-primary transition-colors"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={editingContent[note.id] ?? displayContent}
                        onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                        className="w-full min-h-[250px] bg-transparent border border-border-light/20 text-fg-primary rounded-lg p-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50"
                        placeholder={t("notes.placeholders.content")}
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            lockedNotesArray.length === 0 && (
              <div className="text-center py-8 text-fg-tertiary text-sm">
                {t("notes.empty")}
              </div>
            )
          )}

          {/* Locked Notes Section */}
          {showLockedNotes && lockedNotesArray.length > 0 && (
            <div className="pt-4 border-t border-border-light/20 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fg-tertiary opacity-70 mb-2">
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
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-error/10 border-error/30' 
                          : 'bg-bg-surface/50 border-error/20 hover:bg-bg-surface hover:border-error/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1">
                          <Lock size={14} className="text-error flex-shrink-0" />
                          <h4 className="text-sm font-semibold text-fg-tertiary line-clamp-1">
                            {t("notes.encryptedNote")}
                          </h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteNote(note.id);
                          }}
                          className="p-1 text-fg-quaternary hover:text-error transition-colors rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-fg-tertiary">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </p>
                    </button>

                    {/* EXPANDED CONTENT FOR LOCKED NOTES */}
                    {isSelected && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200 p-4 bg-bg-surface/30 border border-border-light/20 rounded-lg">
                        {isLocked ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Lock className="text-error" size={16} />
                              <h3 className="text-sm font-semibold text-fg-primary">{t("notes.password.protected")}</h3>
                            </div>
                            <p className="text-xs text-fg-secondary mb-3">{t("notes.password.protectedDesc")}</p>
                            
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
                                className="w-full bg-bg-elevated border border-border-light/30 text-fg-primary text-sm rounded-lg px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50"
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
                              <div className="text-error text-xs flex items-center gap-1.5">
                                <AlertCircle size={12} />
                                {passwordError}
                                <button onClick={() => handleResetRequest(note.id)} className="underline hover:no-underline">{t("notes.reset.cta")}</button>
                              </div>
                            )}

                            <button
                              onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                              disabled={!passwordInput || verifyPassword.isPending}
                              className="w-full bg-accent-primary hover:bg-accent-hover text-white text-sm font-medium py-2 rounded-lg transition-all disabled:opacity-50"
                            >
                              {verifyPassword.isPending ? t("notes.password.unlocking") : t("notes.password.unlock")}
                            </button>
                          </div>
                        ) : (
                          /* UNLOCKED CONTENT */
                          <div>
                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-light/20">
                              <span className="text-xs font-medium text-fg-tertiary">Edit Note</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const content = editingContent[note.id] ?? (unlockedContent ?? note.content);
                                    updateNote.mutate({ id: note.id, content });
                                  }}
                                  disabled={updateNote.isPending}
                                  className="text-xs px-3 py-1 bg-accent-primary text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
                                >
                                  {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                                </button>
                                <button
                                  onClick={() => void refetch()}
                                  className="p-1 text-fg-tertiary hover:text-fg-primary transition-colors"
                                >
                                  <RefreshCw size={14} />
                                </button>
                              </div>
                            </div>
                            <textarea
                              value={editingContent[note.id] ?? (unlockedContent ?? note.content)}
                              onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                              className="w-full min-h-[250px] bg-transparent border border-border-light/20 text-fg-primary rounded-lg p-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50"
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
              <div className="w-10 h-10 bg-accent-primary/10 border border-accent-primary/20 rounded-lg flex items-center justify-center">
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