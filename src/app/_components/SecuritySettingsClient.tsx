"use client";

import { useMemo } from "react";
import { Shield } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";

export function SecuritySettingsClient() {
  const t = useTranslations("settings.security");

  const { data, isLoading } = api.settings.get.useQuery();
  const utils = api.useUtils();

  const updateSecurity = api.settings.updatePrivacy.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
    },
  });

  const deleteAllData = api.settings.deleteAllData.useMutation();

  const twoFactorEnabled = data?.twoFactorEnabled ?? false;

  const isBusy =
    isLoading || updateSecurity.isPending || deleteAllData.isPending;

  const twoFactorLabel = useMemo(() => {
    return twoFactorEnabled ? t("disableTwoFactor") : t("enableTwoFactor");
  }, [t, twoFactorEnabled]);

  const onToggle2fa = async () => {
    await updateSecurity.mutateAsync({ twoFactorEnabled: !twoFactorEnabled });
  };

  const onSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const onDeleteAccount = async () => {
    const confirmed = window.confirm(t("deleteConfirm"));
    if (!confirmed) return;

    await deleteAllData.mutateAsync();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <Shield className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">{t("title")}</h2>
          <p className="text-sm text-fg-secondary">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-fg-primary mb-2">{t("twoFactor")}</h3>
          <p className="text-sm text-fg-secondary mb-4">{t("twoFactorDesc")}</p>
          <button
            type="button"
            onClick={onToggle2fa}
            disabled={isBusy}
            className="px-6 py-2 bg-accent-primary text-white font-semibold rounded-lg hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {twoFactorLabel}
          </button>
          {updateSecurity.error ? (
            <p className="mt-2 text-sm text-error">{updateSecurity.error.message}</p>
          ) : null}
        </div>

        <div className="pt-4 border-t border-border-light/20">
          <h3 className="font-semibold text-fg-primary mb-2">{t("session")}</h3>
          <p className="text-sm text-fg-secondary mb-4">{t("sessionDesc")}</p>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isBusy}
            className="px-6 py-2 bg-bg-surface text-fg-primary font-semibold rounded-lg hover:bg-bg-elevated transition-colors border border-border-light/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("signOut")}
          </button>
        </div>

        <div className="pt-4 border-t border-border-light/20">
          <div className="p-4 bg-error/10 rounded-xl border-2 border-error/30">
            <h3 className="font-semibold text-error mb-2">{t("dangerZone")}</h3>
            <p className="text-sm text-fg-secondary mb-4">{t("dangerZoneDesc")}</p>
            <button
              type="button"
              onClick={onDeleteAccount}
              disabled={isBusy}
              className="px-6 py-2 bg-error text-white font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("deleteAccount")}
            </button>
            {deleteAllData.error ? (
              <p className="mt-2 text-sm text-error">{deleteAllData.error.message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
