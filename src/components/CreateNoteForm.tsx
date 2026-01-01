'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { Plus, X, FileEdit, Loader2 } from 'lucide-react';
import { useTranslations } from "next-intl";
import { useToast } from "~/components/ToastProvider";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export const CreateNoteForm: React.FC = () => {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("create");
  const toast = useToast();
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
      toast.error(t("notes.errors.createFailed", { message: error.message }));
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.info(t("notes.validation.contentRequired"));
      return;
    }

    createNote.mutate({
      content: content.trim(),
    });
  };

  return (
    <div className="max-w-2xl surface-card mb-6 sm:mb-8 overflow-hidden">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 sm:p-6 flex items-center justify-center gap-2 sm:gap-3 text-warning hover:bg-warning/10 transition-all duration-300 group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-warning/15 rounded-xl flex items-center justify-center group-hover:bg-warning/25 transition-colors">
            <Plus size={20} className="text-warning sm:w-6 sm:h-6" />
          </div>
          <span className="text-base sm:text-lg font-semibold text-fg-primary">{t("notes.actions.createNew")}</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border-light/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-warning/15 rounded-lg flex items-center justify-center">
                <FileEdit size={16} className="text-warning sm:w-5 sm:h-5" />
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-fg-primary">{t("notes.title")}</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1.5 sm:p-2 text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary/60 rounded-lg transition-colors"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="content" className="block text-xs sm:text-sm font-semibold text-fg-secondary mb-2">
                {t("notes.fields.content")} <span className="text-warning">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("notes.placeholders.content")}
                rows={8}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base bg-bg-surface/60 border border-border-light/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-warning/30 focus:border-warning/50 transition-all text-fg-primary placeholder:text-fg-tertiary resize-none"
                disabled={createNote.isPending}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-border-light/30">
              <button
                type="submit"
                disabled={createNote.isPending || !content.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-warning text-fg-primary font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createNote.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {t("notes.actions.creating")}
                  </>
                ) : (
                  <>
                    <FileEdit size={18} />
                    {t("notes.actions.create")}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={createNote.isPending}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-border-light/30 text-fg-secondary font-semibold rounded-lg hover:bg-bg-secondary/60 transition-all"
              >
                {t("notes.actions.cancel")}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
