"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

type Translator = (key: string, values?: Record<string, unknown>) => string;

type NotificationKey =
  | "emailNotifications"
  | "projectUpdatesNotifications"
  | "eventRemindersNotifications"
  | "taskDueRemindersNotifications"
  | "marketingEmailsNotifications";

function ToggleRow(props: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-bg-surface rounded-xl border border-border-light/15">
      <div className="flex-1">
        <h3 className="font-semibold text-fg-primary">{props.title}</h3>
        <p className="text-sm text-fg-secondary">{props.description}</p>
      </div>

      <label className={`relative inline-flex items-center ${props.disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={props.checked}
          onChange={(e) => props.onChange(e.target.checked)}
          disabled={props.disabled}
          role="switch"
          aria-checked={props.checked}
          className="peer sr-only"
        />
        <span className="relative inline-flex h-7 w-[46px] items-center rounded-full border border-border-light/25 bg-bg-tertiary/50 shadow-sm transition-colors peer-checked:bg-accent-primary peer-checked:border-accent-primary/40 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent-primary/35 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-primary" />
        <span className="pointer-events-none absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-bg-surface shadow-md transition-transform peer-checked:translate-x-[18px]" />
      </label>
    </div>
  );
}

export function NotificationSettingsClient() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings.notifications");

  const { data, isLoading } = api.settings.get.useQuery();
  const utils = api.useUtils();

  const settings = data;

  const updateNotifications = api.settings.updateNotifications.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
    },
  });

  const initial = useMemo(() => {
    return {
      emailNotifications: settings?.emailNotifications ?? true,
      projectUpdatesNotifications: settings?.projectUpdatesNotifications ?? true,
      eventRemindersNotifications: settings?.eventRemindersNotifications ?? false,
      taskDueRemindersNotifications: settings?.taskDueRemindersNotifications === false ? false : true,
      marketingEmailsNotifications: settings?.marketingEmailsNotifications ?? false,
    } satisfies Record<NotificationKey, boolean>;
  }, [settings]);

  const [values, setValues] = useState<Record<NotificationKey, boolean>>(initial);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setValues(initial);
    setTouched(false);
  }, [initial]);

  const isBusy = isLoading || updateNotifications.isPending;

  const onToggle = (key: NotificationKey, checked: boolean) => {
    setValues((prev) => ({ ...prev, [key]: checked }));
    setTouched(true);
  };

  const onSave = async () => {
    await updateNotifications.mutateAsync({
      emailNotifications: values.emailNotifications,
      projectUpdatesNotifications: values.projectUpdatesNotifications,
      eventRemindersNotifications: values.eventRemindersNotifications,
      taskDueRemindersNotifications: values.taskDueRemindersNotifications,
      marketingEmailsNotifications: values.marketingEmailsNotifications,
    });
    setTouched(false);
  };

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <Bell className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">{t("title")}</h2>
          <p className="text-sm text-fg-secondary">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <ToggleRow
          title={t("email")}
          description={t("emailDesc")}
          checked={values.emailNotifications}
          onChange={(checked) => onToggle("emailNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("projects")}
          description={t("projectsDesc")}
          checked={values.projectUpdatesNotifications}
          onChange={(checked) => onToggle("projectUpdatesNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("events")}
          description={t("eventsDesc")}
          checked={values.eventRemindersNotifications}
          onChange={(checked) => onToggle("eventRemindersNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("tasks")}
          description={t("tasksDesc")}
          checked={values.taskDueRemindersNotifications}
          onChange={(checked) => onToggle("taskDueRemindersNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("marketing")}
          description={t("marketingDesc")}
          checked={values.marketingEmailsNotifications}
          onChange={(checked) => onToggle("marketingEmailsNotifications", checked)}
          disabled={isBusy}
        />
      </div>

      <div className="mt-6 pt-6 border-t border-border-light/10 flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isBusy || !touched}
          className="px-8 py-3 bg-accent-primary text-white font-semibold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {updateNotifications.isPending ? t("save") : t("save")}
        </button>
        {updateNotifications.error ? (
          <p className="text-sm text-error">{updateNotifications.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
