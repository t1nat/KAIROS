// src/app/_components/createNoteForm.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Eye, EyeOff, Save, Shield, Info } from "lucide-react";

export function CreateNoteForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = api.useUtils();
  
  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      setContent("");
      setPassword("");
      void utils.note.invalidate();
    },
    onError: (error) => {
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
      className="bg-white rounded-xl shadow-sm border border-[#DDE3E9]/60 overflow-hidden transition-all hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-[#FCFBF9] to-white border-b border-[#DDE3E9]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-lg flex items-center justify-center shadow-sm">
            <Lock className="text-white" size={14} />
          </div>
          <h2 className="text-base font-bold text-[#222B32]">Create New Note</h2>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-[#DDE3E9]/50">
          <Shield size={12} className="text-[#80C49B]" />
          <span className="text-xs font-medium text-[#59677C]">Encrypted</span>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-5 space-y-4">
        {/* Note Content */}
        <div>
          <label className="block text-xs font-semibold text-[#59677C] mb-2 uppercase tracking-wide">
            Note Content
          </label>
          <textarea
            placeholder="Start writing your secure note..." 
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3.5 py-3 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2]/30 focus:border-[#9448F2] bg-[#FCFBF9]/30 text-[#222B32] text-sm resize-none transition-all placeholder:text-[#59677C]/40"
            disabled={createNote.isPending}
          />
          <div className="flex justify-end mt-1.5">
            <span className="text-xs text-[#59677C]/60">
              {content.length} characters
            </span>
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-[#59677C] uppercase tracking-wide">
              Encryption Password
            </label>
            <div className="group relative">
              <Info size={12} className="text-[#59677C]/60 cursor-help" />
              <div className="absolute right-0 top-6 w-64 bg-[#222B32] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                <p className="mb-1 font-semibold">Optional but recommended</p>
                <p className="text-[#59677C]/80">Add a password to encrypt your note. Keep it safe - it cannot be recovered!</p>
                <div className="absolute right-3 -top-1 w-2 h-2 bg-[#222B32] rotate-45" />
              </div>
            </div>
          </div>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Optional: Enter encryption password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 pr-11 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2]/30 focus:border-[#9448F2] bg-[#FCFBF9]/30 text-[#222B32] text-sm transition-all placeholder:text-[#59677C]/40"
              disabled={createNote.isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59677C] hover:text-[#222B32] transition-colors p-1 hover:bg-[#DDE3E9]/30 rounded"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && (
            <div className="flex items-start gap-2 mt-2 p-2.5 bg-[#FFC53D]/10 border border-[#FFC53D]/30 rounded-lg">
              <Shield size={14} className="text-[#FFC53D] mt-0.5 flex-shrink-0" />
              <p className="text-xs text-[#59677C]">
                This note will be encrypted. <span className="font-semibold">Save your password</span> - it cannot be recovered.
              </p>
            </div>
          )}
        </div>
        
        {/* Save Button */}
        <button 
          type="submit"
          className="w-full px-5 py-2.5 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          disabled={createNote.isPending || content.trim().length === 0}
        >
          <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />
          {createNote.isPending ? "Saving..." : "Save Secure Note"}
        </button>
      </div>
    </form>
  );
}