// src/app/_components/notesList.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Unlock, Trash2, Eye, EyeOff, Mail, AlertCircle } from "lucide-react";

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
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [unlockedNotes, setUnlockedNotes] = useState<Record<number, { unlocked: boolean; content: string }>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<number, string>>({});
  const [showResetModal, setShowResetModal] = useState<number | null>(null);

  const { data: notes, refetch } = api.note.getAll.useQuery();
  
  const deleteNote = api.note.delete.useMutation({
    onSuccess: () => {
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

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#9448F2]/10 rounded-full mb-4">
          <Lock className="text-[#9448F2]" size={24} />
        </div>
        <p className="text-[#59677C]">No notes yet. Create your first note above!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note: Note, index: number) => {
          const isLocked = note.passwordHash && !unlockedNotes[note.id]?.unlocked;
          const showPassword = showPasswords[note.id] ?? false;
          const passwordInput = passwordInputs[note.id] ?? '';
          const passwordError = passwordErrors[note.id];
          const unlockedContent = unlockedNotes[note.id]?.content;

          return (
            <div
              key={note.id}
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-[#DDE3E9] p-5"
              style={{ 
                animation: 'fadeInUp 0.3s ease-out forwards',
                animationDelay: `${index * 50}ms`,
                opacity: 0
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-xs text-[#59677C]">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </div>
                  {note.passwordHash && (
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isLocked 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-[#80C49B]/20 text-[#80C49B]'
                    }`}>
                      {isLocked ? 'Locked' : 'Unlocked'}
                    </div>
                  )}
                </div>
                {note.passwordHash && (
                  <div>
                    {isLocked ? (
                      <Lock className="text-red-500" size={16} />
                    ) : (
                      <Unlock className="text-[#80C49B]" size={16} />
                    )}
                  </div>
                )}
              </div>

              {isLocked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#222B32] font-semibold text-sm">
                    <Lock size={16} className="text-red-500" />
                    <span>Password Protected</span>
                  </div>
                  <p className="text-xs text-[#59677C]">
                    Enter your password to view this note
                  </p>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInputs(prev => ({
                            ...prev,
                            [note.id]: e.target.value,
                          }));
                          if (passwordError) {
                            setPasswordErrors(prev => ({
                              ...prev,
                              [note.id]: '',
                            }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handlePasswordSubmit(note.id, passwordInput);
                          }
                        }}
                        placeholder="Enter password"
                        className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] ${
                          passwordError ? 'border-red-500' : 'border-[#DDE3E9]'
                        }`}
                        disabled={verifyPassword.isPending}
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(note.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59677C] hover:text-[#222B32]"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-red-700 font-medium mb-1">{passwordError}</p>
                            <button
                              onClick={() => handleResetRequest(note.id)}
                              className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                            >
                              Forgot password? Reset via email
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                      disabled={!passwordInput || verifyPassword.isPending}
                      className="w-full px-4 py-2 text-sm bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                    >
                      {verifyPassword.isPending ? 'Unlocking...' : 'Unlock Note'}
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Delete this encrypted note? This cannot be undone.')) {
                        deleteNote.mutate({ id: note.id });
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1 mt-3"
                  >
                    <Trash2 size={14} />
                    Delete Note
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-[#FCFBF9] rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
                    <p className="text-[#222B32] text-sm whitespace-pre-wrap break-words">
                      {unlockedContent ?? note.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[#DDE3E9]">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-[#59677C]">
                        {note.shareStatus === 'private' && '🔒 Private'}
                        {note.shareStatus === 'shared_read' && '👁️ Shared'}
                        {note.shareStatus === 'shared_write' && '✏️ Editable'}
                      </div>
                      {note.passwordHash && (
                        <div className="text-xs text-[#80C49B] font-medium">
                          Encrypted ✓
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Delete this note? This cannot be undone.')) {
                          deleteNote.mutate({ id: note.id });
                        }
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors p-1.5 hover:bg-red-50 rounded"
                      title="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Password Reset Modal */}
      {showResetModal !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-[#DDE3E9]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#9448F2]/10 rounded-lg flex items-center justify-center">
                <Mail className="text-[#9448F2]" size={20} />
              </div>
              <h3 className="text-xl font-bold text-[#222B32]">Reset Password</h3>
            </div>
            
            <p className="text-[#59677C] mb-6">
              We will send you an email with a link to reset the password for this note. 
              Make sure you have access to your email account.
            </p>

            <div className="bg-[#FFC53D]/10 border border-[#FFC53D]/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-[#FFC53D] mt-0.5" />
                <p className="text-xs text-[#59677C]">
                  The reset link will expire in 1 hour. You will be able to set a new password 
                  after clicking the link in your email.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(null)}
                className="flex-1 px-4 py-3 border-2 border-[#DDE3E9] text-[#59677C] font-semibold rounded-lg hover:bg-[#FCFBF9] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmResetRequest(showResetModal)}
                disabled={requestPasswordReset.isPending}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {requestPasswordReset.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Mail size={18} />
                    Send Reset Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}