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

  // Reset PIN form state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [hint, setHint] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  const { status } = useSession();
  const enabled = status === "authenticated";

  const utils = api.useUtils();

  const { data, isLoading } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateSecurity = api.settings.updateSecurity.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
    },
  });

  const updateResetPin = api.settings.updateResetPin.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
      setPin("");
      setConfirmPin("");
      setPinError(null);
      toast.success("Reset PIN updated");
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Failed to update reset PIN";
      setPinError(message);
      toast.error(message);
    },
  });

  const deleteAllData = api.settings.deleteAllData.useMutation();

  const twoFactorEnabled = data?.twoFactorEnabled ?? false;
  const notesKeepUnlockedUntilClose = data?.notesKeepUnlockedUntilClose ?? false;
  const hasResetPin = !!data?.resetPinHint || (data?.resetPinFailedAttempts ?? 0) >= 0;

  const isBusy =
    isLoading || updateSecurity.isPending || updateResetPin.isPending || deleteAllData.isPending;

  const onToggle2fa = async () => {
    try {
      await updateSecurity.mutateAsync({ twoFactorEnabled: !twoFactorEnabled });
      toast.success("Security settings updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update security";
      toast.error(message);
    }
  };

  const onToggleKeepUnlocked = async () => {
    try {
      await updateSecurity.mutateAsync({
        notesKeepUnlockedUntilClose: !notesKeepUnlockedUntilClose,
      });
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
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary/20 via-accent-secondary/10 to-bg-elevated flex items-center justify-center shadow-sm">
          <Shield className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-fg-primary">{t("title")}</h2>
          <p className="text-sm text-fg-secondary">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-8">
        <div className="rounded-2xl bg-gradient-to-br from-bg-surface/80 via-bg-elevated/80 to-bg-surface/80 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.9)] border border-border-light/5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-tertiary mb-2">
            {t("twoFactor")}
          </h3>
          <p className="text-sm text-fg-secondary mb-4">{t("twoFactorDesc")}</p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-bg-surface/70 px-4 py-3">
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

        <div className="space-y-5 rounded-2xl bg-gradient-to-br from-bg-surface/80 via-bg-elevated/80 to-bg-surface/80 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.9)] border border-border-light/5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-tertiary mb-2">
              Notes
            </h3>
            <p className="text-sm text-fg-secondary mb-4">
              Control whether encrypted notes stay unlocked while you use the app.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-bg-surface/70 px-4 py-3">
              <div>
                <p className="font-semibold text-fg-primary">
                  Keep encrypted notes unlocked until app is closed
                </p>
                <p className="text-sm text-fg-secondary">
                  If disabled, encrypted notes relock when you leave the notes page.
                </p>
              </div>

              <Toggle
                checked={notesKeepUnlockedUntilClose}
                onChange={() => void onToggleKeepUnlocked()}
                disabled={isBusy}
                label="Keep notes unlocked"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-bg-surface/80 via-bg-elevated/80 to-bg-surface/80 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.9)] border border-border-light/5">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-tertiary mb-2">
              Reset PIN
            </h3>
            <p className="text-sm text-fg-secondary mb-3">
              Configure a secret PIN and optional hint used to reset locked note passwords.
            </p>

            <div className="mb-3 text-xs text-fg-secondary">
              <span className="font-semibold">Status:</span>{" "}
              {hasResetPin ? "PIN configured" : "No PIN configured"}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-fg-secondary mb-1">
                  New PIN (min 4 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full bg-bg-surface/70 text-fg-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-border-light/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-secondary mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value);
                    setPinError(null);
                  }}
                  className="w-full bg-bg-surface/70 text-fg-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-border-light/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-secondary mb-1">
                  Hint (optional, shown when resetting)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  className="w-full bg-bg-surface/70 text-fg-primary text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 border border-border-light/10"
                />
              </div>

              {pinError && (
                <p className="text-xs text-error">{pinError}</p>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!pin || !confirmPin) {
                    setPinError("Please enter and confirm your PIN");
                    return;
                  }
                  void updateResetPin.mutate({ pin, confirmPin, hint });
                }}
                disabled={isBusy}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gradient-to-r from-accent-primary to-accent-secondary text-white text-sm font-semibold shadow-sm hover:shadow-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateResetPin.isPending ? "Saving..." : "Save Reset PIN"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-gradient-to-br from-bg-surface/80 via-bg-elevated/80 to-bg-surface/80 p-5 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.9)] border border-border-light/5">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-fg-tertiary mb-2">
              {t("session")}
            </h3>
            <p className="text-sm text-fg-secondary mb-4">{t("sessionDesc")}</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            disabled={isBusy}
            className="inline-flex items-center justify-center px-6 py-2 rounded-lg bg-bg-elevated text-accent-primary font-semibold hover:bg-accent-primary hover:text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("signOut")}
          </button>
        </div>

        <div className="rounded-2xl bg-error/5 p-5 shadow-[0_18px_45px_-32px_rgba(127,29,29,0.9)] border border-error/20">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-error mb-2">
            {t("dangerZone")}
          </h3>
          <p className="text-sm text-fg-secondary mb-4">{t("dangerZoneDesc")}</p>
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isBusy}
              className="px-6 py-2 rounded-lg bg-error text-white font-semibold shadow-sm hover:shadow-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("deleteAccount")}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={isBusy}
                className="px-6 py-2 rounded-lg bg-error text-white font-semibold shadow-sm hover:shadow-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("deleteAccount")}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isBusy}
                className="px-6 py-2 rounded-lg bg-bg-surface text-fg-primary font-semibold hover:bg-bg-elevated transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}