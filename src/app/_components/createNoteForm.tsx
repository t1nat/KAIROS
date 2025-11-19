// src/app/_components/createNoteForm.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, FilePlus } from "lucide-react"; // Added Lucide icons

// --- Monochromatic/Elegant Style Constants ---
const CARD_BG = 'bg-white';
const TEXT_DARK = 'text-gray-900';
const TEXT_SUBTLE = 'text-gray-600';
const BORDER_LIGHT = 'border-gray-300';
const BORDER_FOCUS = 'border-gray-500 focus:ring-gray-700';
const BUTTON_PRIMARY = 'bg-gray-900 hover:bg-gray-800';
const INPUT_STYLE = `w-full p-3 border ${BORDER_LIGHT} rounded-lg focus:outline-none focus:ring-1 focus:${BORDER_FOCUS} ${CARD_BG} ${TEXT_DARK} resize-none text-base`;


/**
 * A compact form for creating a secure note.
 */
export function CreateNoteForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  
  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      setContent("");
      setPassword("");
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
    
    createNote.mutate({ content, password });
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      // Clean, white background, shadow, and border
      className={`p-6 ${CARD_BG} rounded-xl shadow-lg border ${BORDER_LIGHT} max-w-lg w-full mx-auto text-sm space-y-4`}
    >
      <h2 className={`text-xl font-semibold ${TEXT_DARK} tracking-tight border-b ${BORDER_LIGHT} pb-3`}>
        New Secure Document <Lock className={`inline-block w-4 h-4 ml-2 ${TEXT_SUBTLE}`} />
      </h2>

      {/* Note Content Input: Clean white background, dark text */}
      <textarea
        placeholder="Start typing your document content here..." 
        rows={8}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className={`${INPUT_STYLE} focus:ring-gray-400`}
        disabled={createNote.isPending}
      />

      {/* Password Input */}
      <div>
        <label htmlFor="note-password" className={`text-sm font-medium ${TEXT_SUBTLE} block mb-2`}>
          Encryption Key (Optional):
        </label>
        <input 
          id="note-password"
          type="password" 
          placeholder="Set a key to encrypt this document" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT_STYLE}
          disabled={createNote.isPending}
        />
      </div>
      
      {/* Create Note Button: Primary monochromatic button */}
      <button 
        type="submit"
        className={`w-full ${BUTTON_PRIMARY} text-white py-3 rounded-lg transition flex items-center justify-center text-base font-semibold disabled:bg-gray-400 shadow-md hover:shadow-gray-400/50`}
        disabled={createNote.isPending || content.trim().length === 0}
      >
        <FilePlus className="h-5 w-5 mr-2" />
        {createNote.isPending ? "SAVING DOCUMENT..." : "SAVE DOCUMENT"}
      </button>
    </form>
  );
}