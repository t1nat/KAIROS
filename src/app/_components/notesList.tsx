// src/app/_components/notesList.tsx
// PROPERLY TYPED VERSION - matches your note router

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Unlock, Trash2, Eye, EyeOff } from "lucide-react";

export function NotesList() {
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [unlockedNotes, setUnlockedNotes] = useState<Record<number, { unlocked: boolean; content: string }>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<number, string>>({});

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

  if (!notes || notes.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg">No notes yet. Create your first note above!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => {
        const isLocked = note.passwordHash && !unlockedNotes[note.id]?.unlocked;
        const showPassword = showPasswords[note.id] ?? false;
        const passwordInput = passwordInputs[note.id] ?? '';
        const passwordError = passwordErrors[note.id];
        const unlockedContent = unlockedNotes[note.id]?.content;

        return (
          <div
            key={note.id}
            className="relative group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-slate-200"
          >
            {/* Lock indicator */}
            {note.passwordHash && (
              <div className="absolute top-4 right-4">
                {isLocked ? (
                  <Lock className="text-red-500" size={20} />
                ) : (
                  <Unlock className="text-green-500" size={20} />
                )}
              </div>
            )}

            {isLocked ? (
              // Password-protected note (locked)
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <Lock size={18} className="text-red-500" />
                  <span>Password Protected</span>
                </div>
                <p className="text-sm text-slate-500">
                  Enter password to view this note
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
                        // Clear error when user starts typing
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
                      className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        passwordError ? 'border-red-500' : 'border-slate-300'
                      }`}
                      disabled={verifyPassword.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(note.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-sm text-red-500">{passwordError}</p>
                  )}
                  <button
                    onClick={() => handlePasswordSubmit(note.id, passwordInput)}
                    disabled={!passwordInput || verifyPassword.isPending}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
                  >
                    {verifyPassword.isPending ? 'Verifying...' : 'Unlock'}
                  </button>
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this note?')) {
                        deleteNote.mutate({ id: note.id });
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Note
                  </button>
                </div>
              </div>
            ) : (
              // Unlocked note or no password
              <>
                <div className="mb-4">
                  <p className="text-slate-700 whitespace-pre-wrap break-words">
                    {unlockedContent ?? note.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    {note.shareStatus === 'private' && '🔒 Private'}
                    {note.shareStatus === 'shared_read' && '👁️ Shared (Read)'}
                    {note.shareStatus === 'shared_write' && '✏️ Shared (Write)'}
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this note?')) {
                        deleteNote.mutate({ id: note.id });
                      }
                    }}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  Created {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}