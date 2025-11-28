// src/app/_components/createNoteForm.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { Plus, X, FileEdit, Loader2 } from 'lucide-react';

export const CreateNoteForm: React.FC = () => {
  const utils = api.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState('');

  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      setContent('');
      setShowForm(false);
      void utils.note.invalidate();
    },
    onError: (error) => {
      alert(`Failed to create note: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert('Please add some content to your note');
      return;
    }

    createNote.mutate({
      content: content.trim(),
    });
  };

  return (
    <div className="max-w-2xl bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 mb-6 sm:mb-8 overflow-hidden">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 sm:p-6 flex items-center justify-center gap-2 sm:gap-3 text-[#F8D45E] hover:bg-white/5 transition-all duration-300 group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F8D45E]/20 rounded-xl flex items-center justify-center group-hover:bg-[#F8D45E]/30 transition-colors">
            <Plus size={20} className="text-[#F8D45E] sm:w-6 sm:h-6" />
          </div>
          <span className="text-base sm:text-lg font-semibold text-[#FBF9F5]">Create New Note</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-white/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F8D45E]/20 rounded-lg flex items-center justify-center">
                <FileEdit size={16} className="text-[#F8D45E] sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#FBF9F5]">Create New Note</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1.5 sm:p-2 text-[#E4DEAA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="content" className="block text-xs sm:text-sm font-semibold text-[#E4DEAA] mb-2">
                Note Content <span className="text-[#F8D45E]">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                rows={8}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F8D45E] focus:border-transparent transition-all text-[#FBF9F5] placeholder:text-[#59677C] resize-none"
                disabled={createNote.isPending}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-white/10">
              <button
                type="submit"
                disabled={createNote.isPending || !content.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-[#F8D45E] to-[#F4C542] text-[#181F25] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#F8D45E]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createNote.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileEdit size={18} />
                    Create Note
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={createNote.isPending}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-white/10 text-[#E4DEAA] font-semibold rounded-lg hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};