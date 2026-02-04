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
    <div className="w-full h-full overflow-y-auto bg-bg-primary">
      <div className="w-full px-4 sm:px-6">
        {/* Header */}
        <div className="pt-8 pb-6">
          <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.022em] kairos-fg-primary kairos-font-display mb-2">
            {t("title")}
          </h1>
          <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] kairos-fg-tertiary kairos-font-body">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-8">
          {/* Notifications Card */}
          <div className="mb-8">
            <div className="kairos-bg-surface rounded-[10px] overflow-hidden kairos-section-border">
              {notificationSettings.map((setting, index) => (
                <div key={setting.key} className="relative">
                  <div className="flex items-center justify-between pl-[16px] pr-[18px] py-[11px]">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="text-[17px] leading-[1.235] tracking-[-0.016em] kairos-fg-primary kairos-font-body font-[590] mb-[1px]">
                        {setting.title}
                      </div>
                      <div className="text-[13px] leading-[1.3846] tracking-[-0.006em] kairos-fg-tertiary kairos-font-caption">
                        {setting.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={setting.checked}
                      disabled={isBusy}
                      onClick={() => onToggle(setting.key, !setting.checked)}
                      className={`relative inline-flex h-[31px] w-[51px] flex-shrink-0 rounded-full border transition-colors duration-200 focus:outline-none ${
                        isBusy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                      } ${
                        setting.checked
                          ? "border-transparent"
                          : "border-gray-300/30 dark:border-gray-600/50"
                      } ${
                        !setting.checked ? "kairos-bg-tertiary" : ""
                      }`}
                      style={setting.checked ? { backgroundColor: `rgb(var(--accent-primary))` } : undefined}
                    >
                      <span
                        className={`pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform duration-200 ease-in-out ${
                          setting.checked ? "translate-x-[20px]" : "translate-x-[1px]"
                        }`}
                      />
                    </button>
                  </div>
                  {index < notificationSettings.length - 1 && (
                    <div className="absolute bottom-0 left-[16px] right-[18px] h-[0.33px] kairos-divider" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button Card */}
          <div className="mb-6">
            <div className="kairos-bg-surface rounded-[10px] overflow-hidden kairos-section-border">
              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={isBusy || !touched}
                  className={`w-full py-3.5 rounded-[10px] text-center text-[17px] leading-[1.235] tracking-[-0.016em] font-[590] kairos-font-body transition-all duration-200 ${
                    isBusy || !touched
                      ? "kairos-bg-tertiary kairos-fg-secondary cursor-not-allowed"
                      : "text-white active:opacity-80"
                  }`}
                  style={!isBusy && touched ? { backgroundColor: `rgb(var(--accent-primary))` } : undefined}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {updateNotifications.error && (
            <div className="mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-[10px] overflow-hidden">
                <div className="px-4 py-3.5">
                  <p className="text-[15px] leading-[1.4667] tracking-[-0.012em] text-red-600 dark:text-red-400 kairos-font-body text-center">
                    {updateNotifications.error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Spacing */}
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
}