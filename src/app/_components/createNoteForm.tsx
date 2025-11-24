// src/app/_components/createNoteForm.tsx
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Lock, Eye, EyeOff, Save, Shield, Info, ChevronDown, ChevronUp } from "lucide-react";

export function CreateNoteForm() {
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const utils = api.useUtils();
  
  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      setContent("");
      setPassword("");
      setIsExpanded(false);
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
    <div className="w-96 flex-shrink-0">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A343EC]/30 transition-all text-sm"
        >
          + New Note
        </button>
      ) : (
        <form 
          onSubmit={handleSubmit} 
          className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden animate-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-lg flex items-center justify-center">
                <Lock className="text-white" size={12} />
              </div>
              <h3 className="text-sm font-bold text-[#FBF9F5]">New Note</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-white/5 rounded transition-colors"
            >
              <ChevronUp size={14} className="text-[#E4DEAA]" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-3 space-y-3">
            {/* Note Content */}
            <div>
              <label className="block text-xs font-semibold text-[#E4DEAA] mb-1.5 uppercase tracking-wide">
                Note Content
              </label>
              <textarea
                placeholder="Start writing your secure note..." 
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2]/50 focus:border-[#9448F2] bg-white/5 text-[#FBF9F5] text-sm resize-none transition-all placeholder:text-[#E4DEAA]/40"
                disabled={createNote.isPending}
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-[#E4DEAA]/60">
                  {content.length} characters
                </span>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#E4DEAA] uppercase tracking-wide">
                  Encryption Password
                </label>
                <div className="group relative">
                  <Info size={12} className="text-[#E4DEAA]/60 cursor-help" />
                  <div className="absolute right-0 top-6 w-64 bg-[#222B32] text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-lg">
                    <p className="mb-1 font-semibold">Optional but recommended</p>
                    <p className="text-[#E4DEAA]/80">Add a password to encrypt your note. Keep it safe - it cannot be recovered!</p>
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
                  className="w-full px-3 py-2 pr-10 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2]/50 focus:border-[#9448F2] bg-white/5 text-[#FBF9F5] text-sm transition-all placeholder:text-[#E4DEAA]/40"
                  disabled={createNote.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#E4DEAA] hover:text-[#FBF9F5] transition-colors p-1 hover:bg-white/5 rounded"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {password && (
                <div className="flex items-start gap-2 mt-2 p-2 bg-[#FFC53D]/10 border border-[#FFC53D]/30 rounded-lg">
                  <Shield size={12} className="text-[#FFC53D] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#E4DEAA]">
                    This note will be encrypted. <span className="font-semibold">Save your password</span> - it cannot be recovered.
                  </p>
                </div>
              )}
            </div>
            
            {/* Save Button */}
            <button 
              type="submit"
              className="w-full px-4 py-2 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white text-sm font-semibold rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              disabled={createNote.isPending || content.trim().length === 0}
            >
              <Save className="h-4 w-4 group-hover:scale-110 transition-transform" />
              {createNote.isPending ? "Saving..." : "Save Secure Note"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}