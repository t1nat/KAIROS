"use client";

import { useRef, useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Trash2, Eye, EyeOff, Mail, AlertCircle, FileText, ChevronDown, RefreshCw, FolderLock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/ToastProvider";

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

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-primary/10 rounded-full mb-4">
          <Lock className="text-accent-primary" size={24} />
        </div>
        <p className="text-fg-secondary">{t("notes.empty")}</p>
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-200px)] w-full">
      
      {/* --- ENCRYPTED FOLDER (Positioned Top Right, aligned with New Note button) --- */}
      <div className="absolute -top-14 right-0 z-50">
        {lockedNotesArray.length > 0 && (
          <button
            onClick={() => setShowLockedNotes((s) => !s)}
            className="flex items-center gap-2 bg-bg-surface hover:bg-bg-elevated border border-border-light/50 rounded-lg px-4 py-2.5 text-fg-secondary hover:text-accent-primary transition-all text-sm font-medium shadow-sm"
          >
            <FolderLock size={16} />
            <span>{t("notes.encrypted", { count: lockedNotesArray.length })}</span>
            <ChevronDown 
              size={14} 
              className={`transition-transform duration-200 ${showLockedNotes ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {/* --- SINGLE COLUMN LAYOUT --- */}
      <div className="flex flex-col h-full max-w-3xl mx-auto">
        <h3 className="text-fg-tertiary text-xs font-bold uppercase tracking-widest mb-4 pl-1">{t("notes.title")}</h3>
        
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {unlockedNotesArray.length > 0 ? (
             unlockedNotesArray.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const isLocked = note.passwordHash && !unlockedNotes[note.id]?.unlocked;
              const showPassword = showPasswords[note.id] ?? false;
              const passwordInput = passwordInputs[note.id] ?? '';
              const passwordError = passwordErrors[note.id];
              const unlockedContent = unlockedNotes[note.id]?.content;

              return (
                <div key={note.id} className="space-y-3">
                  <div className={`w-full p-4 rounded-xl border transition-all group ${
                    isSelected 
                      ? 'bg-accent-primary/10 border-accent-primary/40 shadow-accent' 
                      : 'bg-bg-surface border-border-light/30 hover:bg-bg-elevated hover:border-border-light/60'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                        className="flex-1 text-left"
                      >
                        <span className={`text-xs font-medium ${isSelected ? 'text-accent-primary' : 'text-fg-tertiary'}`}>
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        {note.passwordHash && (
                          <Lock size={12} className="text-error" />
                        )}
                        <FileText size={14} className={isSelected ? 'text-accent-primary' : 'text-fg-quaternary group-hover:text-fg-tertiary'} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteNote(note.id);
                          }}
                          className="text-error/70 hover:text-error transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                      className="w-full text-left"
                    >
                      <p className={`text-sm line-clamp-3 font-medium ${isSelected ? 'text-fg-primary' : 'text-fg-secondary'}`}>
                        {note.content.substring(0, 100)}...
                      </p>
                    </button>
                  </div>

                  {/* EXPANDED CONTENT */}
                  {isSelected && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                      {isLocked ? (
                        <>
                          {/* Password Input Card */}
                          <div className="card-base p-6">
                            <div className="flex items-center gap-2 mb-1">
                               <Lock className="text-error" size={20} />
                               <h3 className="text-lg font-bold text-fg-primary">{t("notes.password.protected")}</h3>
                            </div>
                             <p className="text-fg-secondary text-sm mb-5">{t("notes.password.protectedDesc")}</p>
                            
                            <div className="space-y-4">
                              <div className="relative group">
                                <input
                                  type={showPassword ? "text" : "password"}
                                  value={passwordInput}
                                  onChange={(e) => {
                                    setPasswordInputs(prev => ({ ...prev, [note.id]: e.target.value }));
                                    if (passwordError) setPasswordErrors(prev => ({ ...prev, [note.id]: '' }));
                                  }}
                                  onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit(note.id, passwordInput)}
                                  placeholder={t("notes.password.placeholder")}
                                  className="w-full bg-bg-elevated border border-border-light/40 text-fg-primary text-sm placeholder:text-fg-quaternary rounded-lg px-4 py-3 pr-10 outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(note.id)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary transition-colors"
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>

                              {passwordError && (
                                <div className="text-error text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                   <AlertCircle size={12} />
                                   {passwordError}
                                  <button onClick={() => handleResetRequest(note.id)} className="underline ml-1 hover:text-error/80">{t("notes.reset.cta")}</button>
                                </div>
                              )}

                              <button
                                onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                                disabled={!passwordInput || verifyPassword.isPending}
                                className="w-full bg-accent-primary hover:bg-accent-hover text-white text-sm font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
                              >
                                {verifyPassword.isPending ? t("notes.password.unlocking") : t("notes.password.unlock")}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* UNLOCKED CONTENT - EDITABLE */
                        <div className="card-base p-6">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light/50">
                            <div className="flex items-center gap-2">
                              <FileText size={18} className="text-accent-primary" />
                              <h4 className="text-fg-primary font-semibold">{t("notes.edit.title")}</h4>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const content = editingContent[note.id] ?? (unlockedContent ?? note.content);
                                  updateNote.mutate({ id: note.id, content });
                                }}
                                disabled={updateNote.isPending}
                                className="text-success hover:text-success/80 transition-colors px-3 py-1 text-sm font-medium disabled:opacity-50"
                              >
                                {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                              </button>
                              <button
                                onClick={() => void refetch()}
                                className="text-fg-tertiary hover:text-fg-primary transition-colors p-1"
                              >
                                <RefreshCw size={16} />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={editingContent[note.id] ?? (unlockedContent ?? note.content)}
                            onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                            className="w-full min-h-[300px] bg-bg-secondary border border-border-light/40 text-fg-primary rounded-lg p-4 outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all resize-y font-mono text-sm leading-relaxed placeholder:text-fg-quaternary"
                            placeholder={t("notes.placeholders.content")}
                          />
                        </div>
                      )}


                    </div>
                  )}
                </div>
              );
            })
          ) : (
            lockedNotesArray.length > 0 && (
              <div className="bg-bg-surface/70 border border-border-light/30 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                 <div className="w-12 h-12 bg-bg-elevated/60 rounded-full flex items-center justify-center mb-3 border border-border-light/30">
                   <Lock size={20} className="text-fg-secondary" />
                 </div>
                 <p className="text-fg-primary text-sm font-medium">{t("notes.allLocked")}</p>
                 <p className="text-xs text-fg-tertiary mt-1">{t("notes.allLockedHint")}</p>
              </div>
            )
          )}

          {/* Locked Notes Section - Expands Inline */}
          {showLockedNotes && lockedNotesArray.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="px-1 py-2 text-[10px] font-bold text-fg-tertiary uppercase tracking-wider opacity-80">
                {t("notes.password.sectionTitle")}
              </h4>
              <div className="space-y-3">
                {lockedNotesArray.map((note) => {
                  const isSelected = selectedNoteId === note.id;
                  const isLocked = !unlockedNotes[note.id]?.unlocked;
                  const showPassword = showPasswords[note.id] ?? false;
                  const passwordInput = passwordInputs[note.id] ?? '';
                  const passwordError = passwordErrors[note.id];
                  const unlockedContent = unlockedNotes[note.id]?.content;

                  return (
                    <div key={note.id} className="space-y-3">
                      <div className="w-full p-4 rounded-xl border transition-all group bg-bg-surface border-error/30 hover:bg-bg-elevated hover:border-error/50">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                            className="flex-1 text-left"
                          >
                            <span className="text-xs text-fg-tertiary">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <Lock size={14} className="text-error/80 opacity-70 group-hover:opacity-100" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDeleteNote(note.id);
                              }}
                              className="text-error/70 hover:text-error transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                          className="w-full text-left"
                        >
                          <p className="text-sm text-fg-secondary line-clamp-3 font-medium">
                            {t("notes.encryptedNote")}
                          </p>
                        </button>
                      </div>

                      {/* EXPANDED CONTENT FOR LOCKED NOTES */}
                      {isSelected && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                          {isLocked ? (
                            <>
                              {/* Password Input Card */}
                              <div className="card-base p-6">
                                <div className="flex items-center gap-2 mb-1">
                                   <Lock className="text-error" size={20} />
                                  <h3 className="text-lg font-bold text-fg-primary">{t("notes.password.protected")}</h3>
                                </div>
                                <p className="text-fg-secondary text-sm mb-5">{t("notes.password.protectedDesc")}</p>
                                
                                <div className="space-y-4">
                                  <div className="relative group">
                                    <input
                                      type={showPassword ? "text" : "password"}
                                      value={passwordInput}
                                      onChange={(e) => {
                                        setPasswordInputs(prev => ({ ...prev, [note.id]: e.target.value }));
                                        if (passwordError) setPasswordErrors(prev => ({ ...prev, [note.id]: '' }));
                                      }}
                                      onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit(note.id, passwordInput)}
                                      placeholder={t("notes.password.placeholder")}
                                      className="w-full bg-bg-elevated border border-border-light/40 text-fg-primary text-sm placeholder:text-fg-quaternary rounded-lg px-4 py-3 pr-10 outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordVisibility(note.id)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary transition-colors"
                                    >
                                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  </div>

                                  {passwordError && (
                                    <div className="text-error text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                       <AlertCircle size={12} />
                                       {passwordError}
                                      <button onClick={() => handleResetRequest(note.id)} className="underline ml-1 hover:text-error/80">{t("notes.reset.cta")}</button>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                                    disabled={!passwordInput || verifyPassword.isPending}
                                    className="w-full bg-accent-primary hover:bg-accent-hover text-white text-sm font-bold py-3 rounded-lg transition-all shadow-md disabled:opacity-50"
                                  >
                                    {verifyPassword.isPending ? t("notes.password.unlocking") : t("notes.password.unlock")}
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            /* UNLOCKED CONTENT - EDITABLE */
                            <div className="card-base p-6">
                              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border-light/50">
                                <div className="flex items-center gap-2">
                                  <FileText size={18} className="text-accent-primary" />
                                  <h4 className="text-fg-primary font-semibold">{t("notes.edit.title")}</h4>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const content = editingContent[note.id] ?? (unlockedContent ?? note.content);
                                      updateNote.mutate({ id: note.id, content });
                                    }}
                                    disabled={updateNote.isPending}
                                    className="text-success hover:text-success/80 transition-colors px-3 py-1 text-sm font-medium disabled:opacity-50"
                                  >
                                    {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                                  </button>
                                  <button
                                    onClick={() => void refetch()}
                                    className="text-fg-tertiary hover:text-fg-primary transition-colors p-1"
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={editingContent[note.id] ?? (unlockedContent ?? note.content)}
                                onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                                className="w-full min-h-[300px] bg-bg-secondary border border-border-light/40 text-fg-primary rounded-lg p-4 outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 transition-all resize-y font-mono text-sm leading-relaxed placeholder:text-fg-quaternary"
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