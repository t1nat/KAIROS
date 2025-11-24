// src/app/_components/notesList.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Unlock, Trash2, Eye, EyeOff, Mail, AlertCircle, FileText, ChevronDown, ArrowLeft, RefreshCw, FolderLock } from "lucide-react";

// Define the Note type based on your schema
interface Note {
  id: number;
  content: string;
  createdAt: Date;
  passwordHash: string | null;
  passwordSalt: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  shareStatus: "private" | "shared_read" | "shared_write";
  createdById: string;
}

export function NotesList() {
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [showLockedNotes, setShowLockedNotes] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [unlockedNotes, setUnlockedNotes] = useState<Record<number, { unlocked: boolean; content: string }>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<number, string>>({});
  const [showResetModal, setShowResetModal] = useState<number | null>(null);

  const { data: notes, refetch } = api.note.getAll.useQuery();
  
  const deleteNote = api.note.delete.useMutation({
    onSuccess: () => {
      if (selectedNoteId) {
        setSelectedNoteId(null);
      }
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
          [variables.noteId]: 'Incorrect password' 
        }));
      }
    },
    onError: (error, variables) => {
      setPasswordErrors(prev => ({ 
        ...prev, 
        [variables.noteId]: error.message ?? 'Verification failed' 
      }));
    },
  });

  const requestPasswordReset = api.note.requestPasswordReset.useMutation({
    onSuccess: () => {
      alert('✅ Password reset email sent! Check your inbox.');
      setShowResetModal(null);
    },
    onError: (error) => {
      alert(`❌ Error: ${error.message}`);
    },
  });

  const handlePasswordSubmit = (noteId: number, password: string) => {
    if (password.length === 0) {
      setPasswordErrors(prev => ({ 
        ...prev, 
        [noteId]: 'Please enter a password' 
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

  const selectedNote = notes?.find(n => n.id === selectedNoteId);
  const isLocked = selectedNote?.passwordHash && !unlockedNotes[selectedNoteId]?.unlocked;
  const showPassword = selectedNoteId ? showPasswords[selectedNoteId] ?? false : false;
  const passwordInput = selectedNoteId ? passwordInputs[selectedNoteId] ?? '' : '';
  const passwordError = selectedNoteId ? passwordErrors[selectedNoteId] : undefined;
  const unlockedContent = selectedNoteId ? unlockedNotes[selectedNoteId]?.content : undefined;

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#9448F2]/10 rounded-full mb-4">
          <Lock className="text-[#9448F2]" size={24} />
        </div>
        <p className="text-[#E4DEAA]">No notes yet. Create your first note!</p>
      </div>
    );
  }

  return (
    // Relative container allows the encrypted folder to be positioned absolutely relative to this block
    <div className="relative h-[calc(100vh-140px)] w-full">
      
      {/* --- ENCRYPTED FOLDER (Positioned Top Right, pulled up to align with New Note button) --- */}
      <div className="absolute -top-[4.5rem] right-0 z-50">
        {lockedNotesArray.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowLockedNotes((s) => !s)}
              className="flex items-center gap-2 bg-[#1E2024] hover:bg-[#2A2D35] border border-white/10 rounded-lg px-4 py-2.5 text-[#E4DEAA] hover:text-[#A343EC] transition-all text-sm font-medium shadow-sm"
            >
              <FolderLock size={16} />
              <span>Encrypted ({lockedNotesArray.length})</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-200 ${showLockedNotes ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Locked Notes Dropdown List */}
            {showLockedNotes && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[#1E2024] border border-white/10 rounded-xl shadow-2xl p-2 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/20">
                <h4 className="px-3 py-2 text-[10px] font-bold text-[#80C49B] uppercase tracking-wider opacity-80">
                  Password Protected
                </h4>
                {lockedNotesArray.map((note) => (
                  <button
                    key={note.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group"
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      setShowLockedNotes(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-[#E4DEAA]">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </span>
                      <Lock size={12} className="text-red-400 opacity-70 group-hover:opacity-100" />
                    </div>
                    <p className="text-sm text-[#FBF9F5] line-clamp-1 truncate font-medium">
                      🔒 Encrypted Note
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MAIN GRID LAYOUT --- */}
      {/* Fixed sidebar width, Flexible content width. Both start at same vertical line. */}
      <div className="grid grid-cols-[320px_1fr] gap-10 h-full pt-2">
        
        {/* LEFT COL: Sidebar List */}
        <div className="flex flex-col h-full min-h-0">
          <h3 className="text-[#E4DEAA] text-xs font-bold uppercase tracking-widest mb-4 pl-1">Your Notes</h3>
          
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {unlockedNotesArray.length > 0 ? (
               unlockedNotesArray.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all group ${
                    selectedNoteId === note.id 
                      ? 'bg-[#9448F2]/10 border-[#9448F2]/50 shadow-lg shadow-[#9448F2]/10' 
                      : 'bg-[#1E2024] border-white/5 hover:bg-[#2A2D35] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${selectedNoteId === note.id ? 'text-[#A343EC]' : 'text-[#E4DEAA]'}`}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <FileText size={14} className={selectedNoteId === note.id ? 'text-[#A343EC]' : 'text-white/20 group-hover:text-white/40'} />
                  </div>
                  <p className={`text-sm line-clamp-3 font-medium ${selectedNoteId === note.id ? 'text-white' : 'text-[#FBF9F5]/80'}`}>
                    {note.content.substring(0, 100)}...
                  </p>
                </button>
              ))
            ) : (
              /* Designed "All Locked" State */
              lockedNotesArray.length > 0 && (
                <div className="bg-[#1E2024]/50 border border-white/5 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                   <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                     <Lock size={20} className="text-[#E4DEAA]" />
                   </div>
                   <p className="text-[#FBF9F5] text-sm font-medium">All notes are locked</p>
                   <p className="text-xs text-[#E4DEAA]/60 mt-1">Check the encrypted folder</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* RIGHT COL: Detail View */}
        <div className="h-full min-h-0 flex flex-col items-end"> 
          {/* items-end pushes the content to the right side if width < 100%, 
              but flex-col + w-full in child makes it fill nicely. */}
          
          {selectedNoteId && selectedNote ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-[480px] flex flex-col gap-4">
              
              {/* === LOCKED STATE UI === */}
              {isLocked ? (
                <>
                  {/* Card 1: Header Info */}
                  <div className="bg-[#1E2024] border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-lg">
                     <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedNoteId(null)} className="text-[#E4DEAA] hover:text-white transition-colors p-1 hover:bg-white/5 rounded">
                           <ArrowLeft size={18} />
                        </button>
                        <div className="flex flex-col">
                           <div className="flex items-center gap-2">
                              <h2 className="text-lg font-bold text-white">
                                {new Date(selectedNote.createdAt).toLocaleDateString()}
                              </h2>
                              {selectedNote.passwordHash && (
                                <div className="bg-[#9448F2]/20 text-[#A343EC] text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                  Private
                                </div>
                              )}
                           </div>
                           <span className="inline-flex mt-1 bg-red-500/20 text-red-300 text-[10px] px-1.5 py-0.5 rounded font-bold w-fit uppercase tracking-wide">
                             Locked
                           </span>
                        </div>
                     </div>
                     <button onClick={() => void refetch()} className="text-[#E4DEAA] hover:text-white transition-colors p-1">
                       <RefreshCw size={16} />
                     </button>
                  </div>

                  {/* Card 2: Password Input */}
                  <div className="bg-[#1E2024] border border-white/10 rounded-xl p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-1">
                       <Lock className="text-red-400" size={20} />
                       <h3 className="text-lg font-bold text-white">Password Protected</h3>
                    </div>
                    <p className="text-[#E4DEAA] text-sm mb-5">Enter your password to view this note</p>
                    
                    <div className="space-y-4">
                      <div className="relative group">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={passwordInput}
                          onChange={(e) => {
                            setPasswordInputs(prev => ({ ...prev, [selectedNoteId]: e.target.value }));
                            if (passwordError) setPasswordErrors(prev => ({ ...prev, [selectedNoteId]: '' }));
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit(selectedNoteId, passwordInput)}
                          placeholder="Enter password"
                          className="w-full bg-[#2A2D35] border border-white/10 text-white text-sm placeholder-white/30 rounded-lg px-4 py-3 pr-10 outline-none focus:border-[#9448F2] focus:ring-1 focus:ring-[#9448F2] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(selectedNoteId)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {passwordError && (
                        <div className="text-red-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                           <AlertCircle size={12} />
                           {passwordError}
                           <button onClick={() => handleResetRequest(selectedNoteId)} className="underline ml-1 hover:text-red-300">Reset?</button>
                        </div>
                      )}

                      <button
                        onClick={() => handlePasswordSubmit(selectedNoteId, passwordInput)}
                        disabled={!passwordInput || verifyPassword.isPending}
                        className="w-full bg-[#7D52E0] hover:bg-[#6c42d3] text-white text-sm font-bold py-3 rounded-lg transition-all shadow-lg shadow-black/20"
                      >
                        {verifyPassword.isPending ? 'Unlocking...' : 'Unlock Note'}
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Delete Button */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this note? This cannot be undone.')) {
                        deleteNote.mutate({ id: selectedNoteId });
                      }
                    }}
                    className="w-full bg-[#3B1E22] border border-red-500/30 text-red-300 text-sm font-medium py-3 rounded-xl hover:bg-red-950/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Note
                  </button>
                </>
              ) : (
                /* === UNLOCKED CONTENT VIEW === */
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 h-full flex flex-col shadow-2xl">
                   <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-lg flex items-center justify-center text-white shadow-lg">
                           <FileText size={20} />
                         </div>
                         <div>
                            <h2 className="text-white font-bold text-lg">{new Date(selectedNote.createdAt).toLocaleDateString()}</h2>
                            <p className="text-xs text-[#E4DEAA]">Unlocked • Read Mode</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedNoteId(null)}
                          className="p-2 hover:bg-white/10 rounded-lg text-[#E4DEAA] hover:text-white transition-colors"
                          title="Close"
                        >
                          <ArrowLeft size={18} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this note?')) deleteNote.mutate({ id: selectedNoteId });
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0F1115] rounded-lg p-6 shadow-inner border border-white/5">
                      <p className="text-[#FBF9F5] whitespace-pre-wrap leading-relaxed">
                        {unlockedContent ?? selectedNote.content}
                      </p>
                   </div>
                </div>
              )}
            </div>
          ) : (
            /* === EMPTY STATE (RIGHT SIDE) === */
            <div className="h-full w-full max-w-[480px] flex flex-col items-center justify-center text-center opacity-30 pointer-events-none">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <FileText size={32} className="text-white" />
               </div>
               <h3 className="text-lg text-white font-medium">Select a note</h3>
               <p className="text-[#E4DEAA] text-sm">View details here</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Reset Modal (Unchanged) */}
      {showResetModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1115] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#9448F2]/20 rounded-lg flex items-center justify-center">
                <Mail className="text-[#9448F2]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#FBF9F5]">Reset Password</h3>
            </div>
            
            <p className="text-[#E4DEAA] mb-6 text-sm">
              We will send you an email with a link to reset the password for this note.
            </p>

            <div className="bg-[#FFC53D]/10 border border-[#FFC53D]/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-[#FFC53D] mt-0.5" />
                <p className="text-xs text-[#E4DEAA]">
                  The reset link will expire in 1 hour.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(null)}
                className="flex-1 px-4 py-3 border-2 border-white/10 text-[#E4DEAA] font-semibold rounded-lg hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmResetRequest(showResetModal)}
                disabled={requestPasswordReset.isPending}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestPasswordReset.isPending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}