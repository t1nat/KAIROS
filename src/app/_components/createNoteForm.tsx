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
      // Try to invalidate all note queries - change this based on your actual query name
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
      // Removed shareStatus - it's set to 'private' by default in the backend
    });
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 mb-8 overflow-hidden">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-6 flex items-center justify-center gap-3 text-[#F8D45E] hover:bg-white/5 transition-all duration-300 group"
        >
          <div className="w-12 h-12 bg-[#F8D45E]/20 rounded-xl flex items-center justify-center group-hover:bg-[#F8D45E]/30 transition-colors">
            <Plus size={24} className="text-[#F8D45E]" />
          </div>
          <span className="text-lg font-semibold text-[#FBF9F5]">Create New Note</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-8">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F8D45E]/20 rounded-lg flex items-center justify-center">
                <FileEdit size={20} className="text-[#F8D45E]" />
              </div>
              <h2 className="text-2xl font-bold text-[#FBF9F5]">Create New Note</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-[#E4DEEA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-[#E4DEEA] mb-2">
                Note Content <span className="text-[#F8D45E]">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note here..."
                rows={8}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F8D45E] focus:border-transparent transition-all text-[#FBF9F5] placeholder:text-[#59677C] resize-none"
                disabled={createNote.isPending}
              />
            </div>

            <div className="flex gap-3 pt-6 border-t border-white/10">
              <button
                type="submit"
                disabled={createNote.isPending || !content.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#F8D45E] to-[#F4C542] text-[#181F25] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#F8D45E]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createNote.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Creating...
                  </>
                ) : (
                  <>
                    <FileEdit size={20} />
                    Create Note
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={createNote.isPending}
                className="px-6 py-3 border-2 border-white/10 text-[#E4DEAA] font-semibold rounded-lg hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}