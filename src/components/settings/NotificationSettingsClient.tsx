"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { ToggleRow } from "~/components/layout/Toggle";

type Translator = (key: string, values?: Record<string, unknown>) => string;

type NotificationKey =
  | "emailNotifications"
  | "projectUpdatesNotifications"
  | "eventRemindersNotifications"
  | "taskDueRemindersNotifications"
  | "marketingEmailsNotifications";

export function NotificationSettingsClient() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings.notifications");

  const { status } = useSession();
  const enabled = status === "authenticated";

  const { data, isLoading } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
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
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl ios-card-elevated p-8">
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
          onChange={(checked: boolean) => onToggle("emailNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("projects")}
          description={t("projectsDesc")}
          checked={values.projectUpdatesNotifications}
          onChange={(checked: boolean) => onToggle("projectUpdatesNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("events")}
          description={t("eventsDesc")}
          checked={values.eventRemindersNotifications}
          onChange={(checked: boolean) => onToggle("eventRemindersNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("tasks")}
          description={t("tasksDesc")}
          checked={values.taskDueRemindersNotifications}
          onChange={(checked: boolean) => onToggle("taskDueRemindersNotifications", checked)}
          disabled={isBusy}
        />
        <ToggleRow
          title={t("marketing")}
          description={t("marketingDesc")}
          checked={values.marketingEmailsNotifications}
          onChange={(checked: boolean) => onToggle("marketingEmailsNotifications", checked)}
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
          {t("save")}
        </button>
        {updateNotifications.error ? (
          <p className="text-sm text-error">{updateNotifications.error.message}</p>
        ) : null}
      </div>
    </div>
  );
}