// src/app/_components/createNoteForm.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, FilePlus, Eye, EyeOff } from "lucide-react";

export function CreateNoteForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = api.useUtils();
  
  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      setContent("");
      setPassword("");
      // Invalidate all note queries to refresh any lists/displays
      // If you have specific queries like 'getAll', 'getByUser', etc., 
      // you can invalidate them specifically instead:
      // void utils.note.getAll.invalidate();
      void utils.note.invalidate();
    },
    onError: (error) => {
      console.error("Failed to create note:", error);
      alert(`Error creating note: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert("Note content cannot be empty.");
      return;
    }
    
    createNote.mutate({ 
      content: content.trim(),
      password: password.trim() || undefined
    });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-6 bg-[rgb(var(--bg-secondary))] rounded-xl shadow-lg border border-[rgb(var(--border-light))] max-w-lg w-full mx-auto space-y-4"
    >
      <h2 className="text-xl font-semibold text-[rgb(var(--text-primary))] tracking-tight border-b border-[rgb(var(--border-light))] pb-3 flex items-center gap-2">
        New Secure Document
        <Lock className="w-4 h-4 text-[rgb(var(--text-secondary))]" />
      </h2>

      {/* Note Content Input */}
      <textarea
        placeholder="Start typing your document content here..." 
        rows={8}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-3 border border-[rgb(var(--border-light))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:border-transparent bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] resize-none"
        disabled={createNote.isPending}
      />

      {/* Password Input */}
      <div>
        <label htmlFor="note-password" className="text-sm font-medium text-[rgb(var(--text-secondary))] block mb-2">
          Encryption Key (Optional):
        </label>
        <div className="relative">
          <input 
            id="note-password"
            type={showPassword ? "text" : "password"}
            placeholder="Set a key to encrypt this document" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 pr-12 border border-[rgb(var(--border-light))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-primary))] focus:border-transparent bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))]"
            disabled={createNote.isPending}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {password && (
          <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">
            ⚠️ Make sure to remember this password. You will need it to view the note.
          </p>
        )}
      </div>
      
      {/* Create Note Button */}
      <button 
        type="submit"
        className="w-full px-6 py-3 bg-[rgb(var(--accent-primary))] text-white font-semibold rounded-lg hover:opacity-90 transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        disabled={createNote.isPending || content.trim().length === 0}
      >
        <FilePlus className="h-5 w-5" />
        {createNote.isPending ? "SAVING DOCUMENT..." : "SAVE DOCUMENT"}
      </button>
    </form>
  );
}