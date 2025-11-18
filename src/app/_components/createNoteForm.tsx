"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function CreateNoteForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");

  const createNote = api.note.create.useMutation({
    onSuccess: (data) => {
      // Clear the form
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
    
    // Call the tRPC mutation
    createNote.mutate({ content, password });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full mt-4 p-6 bg-white/40 rounded-xl shadow-2xl border border-gray-200 text-lg text-gray-800">
      <h2 className="text-2xl font-bold mb-4 text-[#140C00]">New Secure Note</h2>

      {/* Note Content Input */}
      <textarea
        placeholder="Type your sticky note content here..." 
        rows={6}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-4 rounded-lg border-2 border-yellow-500 bg-yellow-100 placeholder-gray-600 focus:outline-none focus:ring-4 focus:ring-yellow-400 text-gray-900 resize-none font-serif shadow-inner"
        style={{ minHeight: '150px' }}
        disabled={createNote.isPending}
      />

      {/* Password Input */}
      <div className="mt-4">
        <label htmlFor="note-password" className="text-sm font-semibold text-[#140C00] block mb-1">Optional Password:</label>
        <input 
          id="note-password"
          type="password" 
          placeholder="Set a password to secure this note" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          disabled={createNote.isPending}
        />
      </div>
      
      {/* Create Note Button */}
      <button 
        type="submit"
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition flex items-center justify-center text-xl font-bold shadow-lg"
        disabled={createNote.isPending || content.trim().length === 0}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {createNote.isPending ? "Saving..." : "Create Note"}
      </button>
    </form>
  );
}