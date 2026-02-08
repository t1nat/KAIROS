"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { useTranslations } from "next-intl";
import { useToast } from "~/components/providers/ToastProvider";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export function CreateNoteForm() {
  const t = useTranslations("create");
  const toast = useToast();
  const utils = api.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [password, setPassword] = useState("");

  const createNote = api.note.create.useMutation({
    onSuccess: async () => {
      await utils.note.getAll.invalidate();
      setContent("");
      setPassword("");
      setShowForm(false);
      toast.success(t("notes.success.created"));
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
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("notes.placeholders.content")}
            className="flex-1 p-4 rounded-2xl bg-bg-secondary border border-border-light/20 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary resize-none"
            autoFocus
          />

          <div>
            <label className="block text-xs font-semibold text-fg-secondary mb-2 uppercase tracking-wide">
              {t("notes.labels.password")} <span className="text-fg-tertiary font-normal">({t("notes.optional")})</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("notes.placeholders.password")}
              className="w-full px-4 py-3 bg-bg-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 text-fg-primary placeholder:text-fg-tertiary transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createNote.isPending || !content.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {createNote.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {t("notes.actions.creating")}
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    {t("notes.actions.create")}
                  </>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-3 rounded-lg border border-border-light/20 text-fg-primary hover:bg-bg-secondary transition-all"
            >
              {t("notes.actions.cancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
