"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

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

  const notificationSettings = [
    {
      key: "emailNotifications" as NotificationKey,
      title: t("email"),
      description: t("emailDesc"),
      checked: values.emailNotifications,
    },
    {
      key: "projectUpdatesNotifications" as NotificationKey,
      title: t("projects"),
      description: t("projectsDesc"),
      checked: values.projectUpdatesNotifications,
    },
    {
      key: "eventRemindersNotifications" as NotificationKey,
      title: t("events"),
      description: t("eventsDesc"),
      checked: values.eventRemindersNotifications,
    },
    {
      key: "taskDueRemindersNotifications" as NotificationKey,
      title: t("tasks"),
      description: t("tasksDesc"),
      checked: values.taskDueRemindersNotifications,
    },
    {
      key: "marketingEmailsNotifications" as NotificationKey,
      title: t("marketing"),
      description: t("marketingDesc"),
      checked: values.marketingEmailsNotifications,
    },
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50/50 dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif] mb-2">
            {t("title")}
          </h1>
          <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          {/* Notifications Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              {notificationSettings.map((setting, index) => (
                <div key={setting.key} className="relative">
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510] mb-[2px]">
                        {setting.title}
                      </div>
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
                        {setting.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={setting.checked}
                      disabled={isBusy}
                      onClick={() => onToggle(setting.key, !setting.checked)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-primary/30 ${
                        isBusy ? "opacity-50 cursor-not-allowed" : ""
                      } ${
                        !setting.checked ? "bg-gray-300 dark:bg-gray-700" : ""
                      }`}
                      style={setting.checked ? { backgroundColor: "var(--accent-color, #8b5cf6)" } : undefined}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          setting.checked ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {index < notificationSettings.length - 1 && (
                    <div className="absolute bottom-0 left-4 right-4 h-[0.5px] bg-gray-200/50 dark:bg-gray-800/50" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isBusy || !touched}
                  className={`w-full py-3.5 rounded-lg text-center text-[16px] leading-[1.25] tracking-[-0.01em] font-[510] font-[system-ui,Kairos,sans-serif] transition-all ${
                    isBusy || !touched
                      ? "bg-gray-100/60 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-accent-primary text-white hover:bg-accent-hover active:opacity-90"
                  }`}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {updateNotifications.error && (
            <div className="mb-3">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl overflow-hidden">
                <div className="px-4 py-3.5">
                  <p className="text-[15px] leading-[1.3] tracking-[-0.012em] text-red-600 dark:text-red-400 font-[system-ui,Kairos,sans-serif] text-center">
                    {updateNotifications.error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Spacing */}
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
}
