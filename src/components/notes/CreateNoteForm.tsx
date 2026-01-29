'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { X, FileEdit, Loader2 } from 'lucide-react';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const createNote = api.note.create.useMutation({
    onSuccess: () => {
      setContent('');
      setPassword('');
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
      password: password.trim() ? password : undefined,
    });
  };

  return (
    <div className="h-full flex flex-col">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-5 rounded-3xl bg-accent-primary text-white shadow-xl shadow-accent-primary/20 hover:shadow-2xl hover:shadow-accent-primary/30 hover:brightness-[1.02] transition-all"
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

          <div className="flex-1 flex flex-col gap-3">
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

            <div>
              <label className="block text-sm font-semibold text-fg-primary mb-2">
                Password (optional)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Add a password to lock this note"
                  className="w-full px-4 py-3 text-base bg-bg-surface/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-primary/35 transition-all text-fg-primary placeholder:text-fg-quaternary shadow-sm"
                  disabled={createNote.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-tertiary hover:text-fg-primary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 mt-4">
            <button
              type="submit"
              disabled={createNote.isPending || !content.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm bg-accent-primary text-white font-semibold rounded-xl shadow-md shadow-accent-primary/15 hover:shadow-lg hover:shadow-accent-primary/20 hover:brightness-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
