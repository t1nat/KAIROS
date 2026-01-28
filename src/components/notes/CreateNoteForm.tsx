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
          className="w-full p-5 rounded-3xl bg-gradient-to-b from-bg-elevated to-bg-surface/70 text-fg-primary shadow-xl shadow-accent-primary/10 hover:shadow-2xl hover:shadow-accent-primary/15 transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="text-lg sm:text-xl font-bold tracking-[-0.02em]">{t("notes.actions.createNew")}</span>
          </div>
          <div className="mt-3 h-1.5 w-24 mx-auto rounded-full bg-gradient-to-r from-accent-primary/70 via-accent-secondary/50 to-success/30" />
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="leading-tight">
              <h2 className="text-lg font-bold text-fg-primary tracking-[-0.02em]">New note</h2>
              <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-accent-primary/70 to-accent-secondary/50" />
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-fg-tertiary hover:text-fg-primary rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              id="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder={t("notes.placeholders.content")}
              className="w-full px-4 py-3 text-lg bg-bg-surface/60 rounded-3xl focus:outline-none focus:ring-2 focus:ring-accent-primary/35 transition-all text-fg-primary placeholder:text-fg-quaternary resize-none min-h-[160px] max-h-[460px] overflow-y-auto shadow-md"
              disabled={createNote.isPending}
            />
          </div>

          <div className="flex gap-2 pt-4 mt-4">
            <button
              type="submit"
              disabled={createNote.isPending || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl shadow-md shadow-accent-primary/15 hover:shadow-lg hover:shadow-accent-primary/20 hover:brightness-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="px-4 py-3 text-sm bg-bg-surface/40 text-fg-secondary font-semibold rounded-xl shadow-sm hover:shadow-md hover:bg-bg-secondary/50 transition-all"
            >
              {t("notes.actions.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
