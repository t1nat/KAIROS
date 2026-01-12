"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { useToast } from "~/components/providers/ToastProvider";
import { Toggle } from "~/components/layout/Toggle";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export function SecuritySettingsClient() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings.security");
  const toast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { status } = useSession();
  const enabled = status === "authenticated";

  const utils = api.useUtils();

  const { data, isLoading } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateSecurity = api.settings.updatePrivacy.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
    },
  });

  const deleteAllData = api.settings.deleteAllData.useMutation();

  const twoFactorEnabled = data?.twoFactorEnabled ?? false;

  const isBusy =
    isLoading || updateSecurity.isPending || deleteAllData.isPending;

  const onToggle2fa = async () => {
    try {
      await updateSecurity.mutateAsync({ twoFactorEnabled: !twoFactorEnabled });
      toast.success("Security settings updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update security";
      toast.error(message);
    }
  };

  const onSignOut = async () => {
    await utils.settings.get.cancel();
    await signOut({ callbackUrl: "/" });
  };

  const onDeleteAccount = async () => {
    try {
      await deleteAllData.mutateAsync();
      toast.success("Account deleted");
      await utils.settings.get.cancel();
      await signOut({ callbackUrl: "/" });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete account";
      toast.error(message);
    }
  };

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl ios-card-elevated p-8">
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
          <div className="flex items-center justify-between gap-4 p-4 bg-bg-surface rounded-xl ios-card">
            <div>
              <p className="font-semibold text-fg-primary">
                {twoFactorEnabled ? t("disableTwoFactor") : t("enableTwoFactor")}
              </p>
              <p className="text-sm text-fg-secondary">
                {twoFactorEnabled
                  ? "Two-factor authentication is currently enabled"
                  : "Add an extra layer of security to your account"}
              </p>
            </div>

            <Toggle
              checked={twoFactorEnabled}
              onChange={() => void onToggle2fa()}
              disabled={isBusy}
              label="Two-factor authentication"
            />
          </div>

          {updateSecurity.error ? (
            <p className="mt-2 text-sm text-error">{updateSecurity.error.message}</p>
          ) : null}
        </div>

        <div className="pt-4 border-t border-border-light/10">
          <h3 className="font-semibold text-fg-primary mb-2">{t("session")}</h3>
          <p className="text-sm text-fg-secondary mb-4">{t("sessionDesc")}</p>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isBusy}
            className="px-6 py-2 bg-accent-primary/10 text-accent-primary font-semibold rounded-lg hover:bg-accent-primary hover:text-white transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("signOut")}
          </button>
        </div>

        <div className="pt-4 border-t border-border-light/10">
          <div className="p-4 bg-error/10 rounded-xl border-2 border-error/30">
            <h3 className="font-semibold text-error mb-2">{t("dangerZone")}</h3>
            <p className="text-sm text-fg-secondary mb-4">{t("dangerZoneDesc")}</p>
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isBusy}
                className="px-6 py-2 bg-error text-white font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("deleteAccount")}
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onDeleteAccount}
                  disabled={isBusy}
                  className="px-6 py-2 bg-error text-white font-semibold rounded-lg hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("deleteAccount")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isBusy}
                  className="px-6 py-2 bg-bg-surface text-fg-primary font-semibold rounded-lg hover:bg-bg-elevated transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            )}
            {deleteAllData.error ? (
              <p className="mt-2 text-sm text-error">{deleteAllData.error.message}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}