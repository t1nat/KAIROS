"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Trash2, Eye, EyeOff, Mail, AlertCircle, FileText, ChevronDown, RefreshCw, FolderLock } from "lucide-react";
import { useTranslations } from "next-intl";

export function NotesList() {
  const t = useTranslations("create");
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showLockedNotes, setShowLockedNotes] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [unlockedNotes, setUnlockedNotes] = useState<Record<number, { unlocked: boolean; content: string }>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<number, string>>({});
  const [showResetModal, setShowResetModal] = useState<number | null>(null);

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
      alert(t("notes.reset.success"));
      setShowResetModal(null);
    },
    onError: (error) => {
      alert(t("errors.generic", { message: error.message }));
    },
  });

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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#9448F2]/10 rounded-full mb-4">
          <Lock className="text-[#9448F2]" size={24} />
        </div>
        <p className="text-[#E4DEAA]">{t("notes.empty")}</p>
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
            className="flex items-center gap-2 bg-[#1E2024] hover:bg-[#2A2D35] border border-white/10 rounded-lg px-4 py-2.5 text-[#E4DEAA] hover:text-[#A343EC] transition-all text-sm font-medium shadow-sm"
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
        <h3 className="text-[#E4DEAA] text-xs font-bold uppercase tracking-widest mb-4 pl-1">{t("notes.title")}</h3>
        
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
                      ? 'bg-[#9448F2]/10 border-[#9448F2]/50 shadow-lg shadow-[#9448F2]/10' 
                      : 'bg-[#1E2024] border-white/5 hover:bg-[#2A2D35] hover:border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                        className="flex-1 text-left"
                      >
                        <span className={`text-xs font-medium ${isSelected ? 'text-[#A343EC]' : 'text-[#E4DEAA]'}`}>
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        {note.passwordHash && (
                          <Lock size={12} className="text-red-400" />
                        )}
                        <FileText size={14} className={isSelected ? 'text-[#A343EC]' : 'text-white/20 group-hover:text-white/40'} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t("notes.deleteConfirm"))) {
                              deleteNote.mutate({ id: note.id });
                            }
                          }}
                          className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                      className="w-full text-left"
                    >
                      <p className={`text-sm line-clamp-3 font-medium ${isSelected ? 'text-white' : 'text-[#FBF9F5]/80'}`}>
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
                          <div className="bg-[#1E2024] border border-white/10 rounded-xl p-6 shadow-xl">
                            <div className="flex items-center gap-2 mb-1">
                               <Lock className="text-red-400" size={20} />
                               <h3 className="text-lg font-bold text-white">{t("notes.password.protected")}</h3>
                            </div>
                             <p className="text-[#E4DEAA] text-sm mb-5">{t("notes.password.protectedDesc")}</p>
                            
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
                                  className="w-full bg-[#2A2D35] border border-white/10 text-white text-sm placeholder-white/30 rounded-lg px-4 py-3 pr-10 outline-none focus:border-[#9448F2] focus:ring-1 focus:ring-[#9448F2] transition-all"
                                />
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(note.id)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                >
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              </div>

                              {passwordError && (
                                <div className="text-red-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                   <AlertCircle size={12} />
                                   {passwordError}
                                   <button onClick={() => handleResetRequest(note.id)} className="underline ml-1 hover:text-red-300">{t("notes.reset.cta")}</button>
                                </div>
                              )}

                              <button
                                onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                                disabled={!passwordInput || verifyPassword.isPending}
                                className="w-full bg-[#7D52E0] hover:bg-[#6c42d3] text-white text-sm font-bold py-3 rounded-lg transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                              >
                                {verifyPassword.isPending ? t("notes.password.unlocking") : t("notes.password.unlock")}
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* UNLOCKED CONTENT - EDITABLE */
                        <div className="bg-[#0F1115] border border-white/10 rounded-xl p-6 shadow-xl">
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                            <div className="flex items-center gap-2">
                              <FileText size={18} className="text-[#A343EC]" />
                              <h4 className="text-white font-semibold">{t("notes.edit.title")}</h4>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const content = editingContent[note.id] ?? (unlockedContent ?? note.content);
                                  updateNote.mutate({ id: note.id, content });
                                }}
                                disabled={updateNote.isPending}
                                className="text-[#80C49B] hover:text-[#9BDB9B] transition-colors px-3 py-1 text-sm font-medium disabled:opacity-50"
                              >
                                {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                              </button>
                              <button
                                onClick={() => void refetch()}
                                className="text-[#E4DEAA] hover:text-white transition-colors p-1"
                              >
                                <RefreshCw size={16} />
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={editingContent[note.id] ?? (unlockedContent ?? note.content)}
                            onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                            className="w-full min-h-[300px] bg-[#1E2024] border border-white/10 text-[#FBF9F5] rounded-lg p-4 outline-none focus:border-[#9448F2] focus:ring-1 focus:ring-[#9448F2] transition-all resize-y font-mono text-sm leading-relaxed"
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
              <div className="bg-[#1E2024]/50 border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                 <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                   <Lock size={20} className="text-[#E4DEAA]" />
                 </div>
                 <p className="text-[#FBF9F5] text-sm font-medium">{t("notes.allLocked")}</p>
                 <p className="text-xs text-[#E4DEAA]/60 mt-1">{t("notes.allLockedHint")}</p>
              </div>
            )
          )}

          {/* Locked Notes Section - Expands Inline */}
          {showLockedNotes && lockedNotesArray.length > 0 && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="px-1 py-2 text-[10px] font-bold text-[#80C49B] uppercase tracking-wider opacity-80">
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
                      <div className="w-full p-4 rounded-xl border transition-all group bg-[#1E2024] border-red-500/20 hover:bg-[#2A2D35] hover:border-red-500/40">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                            className="flex-1 text-left"
                          >
                            <span className="text-xs text-[#E4DEAA]">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <Lock size={14} className="text-red-400 opacity-70 group-hover:opacity-100" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(t("notes.deleteConfirm"))) {
                                  deleteNote.mutate({ id: note.id });
                                }
                              }}
                              className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedNoteId(isSelected ? null : note.id)}
                          className="w-full text-left"
                        >
                          <p className="text-sm text-[#FBF9F5] line-clamp-3 font-medium">
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
                              <div className="bg-[#1E2024] border border-white/10 rounded-xl p-6 shadow-xl">
                                <div className="flex items-center gap-2 mb-1">
                                   <Lock className="text-red-400" size={20} />
                                  <h3 className="text-lg font-bold text-white">{t("notes.password.protected")}</h3>
                                </div>
                                <p className="text-[#E4DEAA] text-sm mb-5">{t("notes.password.protectedDesc")}</p>
                                
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
                                      className="w-full bg-[#2A2D35] border border-white/10 text-white text-sm placeholder-white/30 rounded-lg px-4 py-3 pr-10 outline-none focus:border-[#9448F2] focus:ring-1 focus:ring-[#9448F2] transition-all"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordVisibility(note.id)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                    >
                                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                  </div>

                                  {passwordError && (
                                    <div className="text-red-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                       <AlertCircle size={12} />
                                       {passwordError}
                                       <button onClick={() => handleResetRequest(note.id)} className="underline ml-1 hover:text-red-300">{t("notes.reset.cta")}</button>
                                    </div>
                                  )}

                                  <button
                                    onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                                    disabled={!passwordInput || verifyPassword.isPending}
                                    className="w-full bg-[#7D52E0] hover:bg-[#6c42d3] text-white text-sm font-bold py-3 rounded-lg transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                                  >
                                    {verifyPassword.isPending ? t("notes.password.unlocking") : t("notes.password.unlock")}
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            /* UNLOCKED CONTENT - EDITABLE */
                            <div className="bg-[#0F1115] border border-white/10 rounded-xl p-6 shadow-xl">
                              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                                <div className="flex items-center gap-2">
                                  <FileText size={18} className="text-[#A343EC]" />
                                  <h4 className="text-white font-semibold">{t("notes.edit.title")}</h4>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const content = editingContent[note.id] ?? (unlockedContent ?? note.content);
                                      updateNote.mutate({ id: note.id, content });
                                    }}
                                    disabled={updateNote.isPending}
                                    className="text-[#80C49B] hover:text-[#9BDB9B] transition-colors px-3 py-1 text-sm font-medium disabled:opacity-50"
                                  >
                                    {updateNote.isPending ? t("notes.edit.saving") : t("notes.edit.save")}
                                  </button>
                                  <button
                                    onClick={() => void refetch()}
                                    className="text-[#E4DEAA] hover:text-white transition-colors p-1"
                                  >
                                    <RefreshCw size={16} />
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={editingContent[note.id] ?? (unlockedContent ?? note.content)}
                                onChange={(e) => setEditingContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                                className="w-full min-h-[300px] bg-[#1E2024] border border-white/10 text-[#FBF9F5] rounded-lg p-4 outline-none focus:border-[#9448F2] focus:ring-1 focus:ring-[#9448F2] transition-all resize-y font-mono text-sm leading-relaxed"
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
          <div className="bg-[#0F1115] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#9448F2]/20 rounded-lg flex items-center justify-center">
                <Mail className="text-[#9448F2]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#FBF9F5]">{t("notes.reset.title")}</h3>
            </div>
            
            <p className="text-[#E4DEAA] mb-6 text-sm">
              {t("notes.reset.desc")}
            </p>

            <div className="bg-[#FFC53D]/10 border border-[#FFC53D]/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-[#FFC53D] mt-0.5" />
                <p className="text-xs text-[#E4DEAA]">
                  {t("notes.reset.expiry")}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(null)}
                className="flex-1 px-4 py-3 border-2 border-white/10 text-[#E4DEAA] font-semibold rounded-lg hover:bg-white/5 transition-all"
              >
                {t("notes.actions.cancel")}
              </button>
              <button
                onClick={() => confirmResetRequest(showResetModal)}
                disabled={requestPasswordReset.isPending}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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