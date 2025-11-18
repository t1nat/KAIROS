"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

/**
 * A compact form for creating a secure note.
 * Styles are simplified and reduced for a smaller footprint.
 */
export function CreateNoteForm() {
  // Removed confirmPassword as it was not used in the original submit logic.
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  
  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      // Clear the form on success
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
    // Reduced overall padding, width utility, and shadow/border complexity
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow-md max-w-sm mx-auto text-sm">
      <h2 className="text-base font-semibold mb-3">New Secure Note</h2>

      {/* Note Content Input: Smaller rows, padding, and simplified styling */}
      <textarea
        placeholder="Note content..." 
        rows={3} // Reduced from 6
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 mb-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-yellow-500 text-gray-900 resize-none text-sm"
        disabled={createNote.isPending}
      />

      {/* Password Input: Smaller margins and padding */}
      <div className="mb-4">
        <label htmlFor="note-password" className="text-xs font-medium text-gray-700 block mb-1">Password (Optional):</label>
        <input 
          id="note-password"
          type="password" 
          placeholder="Set a password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded-md text-gray-900 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          disabled={createNote.isPending}
        />
      </div>
      
      {/* Create Note Button: Reduced padding, font size, and simplified icon/text styling */}
      <button 
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition flex items-center justify-center text-sm font-medium disabled:opacity-50"
        disabled={createNote.isPending || content.trim().length === 0}
      >
        {/* Simplified SVG size */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {createNote.isPending ? "Saving..." : "Create Note"}
      </button>
    </form>
  );
}