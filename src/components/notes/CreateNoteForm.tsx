'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { Plus, X, FileEdit, Loader2 } from 'lucide-react';
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";

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
    <div className="h-full flex flex-col">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-3 sm:p-4 flex items-center justify-center gap-2 border-2 border-dashed border-border-medium/40 rounded-xl text-fg-tertiary hover:text-accent-primary hover:border-accent-primary/40 hover:bg-accent-primary/5 transition-all group"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">{t("notes.actions.createNew")}</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-light/20">
            <h2 className="text-base font-semibold text-fg-primary flex items-center gap-2">
              <FileEdit size={16} className="text-accent-primary" />
              {t("notes.title")}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-1 text-fg-tertiary hover:text-fg-primary rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("notes.placeholders.content")}
              className="flex-1 w-full px-3 py-3 text-sm bg-transparent border border-border-light/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/50 transition-all text-fg-primary placeholder:text-fg-quaternary resize-none"
              disabled={createNote.isPending}
            />
          </div>

          <div className="flex gap-2 pt-4 mt-4 border-t border-border-light/20">
            <button
              type="submit"
              disabled={createNote.isPending || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-accent-primary text-white font-medium rounded-lg hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createNote.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  {t("notes.actions.creating")}
                </>
              ) : (
                <>
                  <FileEdit size={16} />
                  {t("notes.actions.create")}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={createNote.isPending}
              className="px-4 py-2.5 text-sm border border-border-light/30 text-fg-secondary font-medium rounded-lg hover:bg-bg-secondary/40 transition-all"
            >
              {t("notes.actions.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
