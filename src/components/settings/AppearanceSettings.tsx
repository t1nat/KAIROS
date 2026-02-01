"use client";

import { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { useToast } from "~/components/providers/ToastProvider";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export function AppearanceSettings() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings");
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const toast = useToast();
  const utils = api.useUtils();

  const { status } = useSession();
  const enabled = status === "authenticated";

  const { data } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateAppearance = api.settings.updateAppearance.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
    },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
            <Palette className="text-accent-primary" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-fg-primary">Appearance</h2>
            <p className="text-sm text-fg-secondary">Customize how Kairos looks</p>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-20 bg-bg-surface rounded-xl mb-4"></div>
          <div className="h-20 bg-bg-surface rounded-xl mb-4"></div>
          <div className="h-20 bg-bg-surface rounded-xl"></div>
        </div>
      </div>
    );
  }

  const currentTheme = theme === 'system' ? systemTheme : theme;

  const normalizeAccent = (accent?: string | null) => {
    switch (accent) {
      case "purple":
      case "pink":
      case "caramel":
      case "mint":
      case "sky":
      case "strawberry":
        return accent;
      case "indigo":
        return "purple";
      case "cyan":
      case "teal":
      case "green":
        return "mint";
      case "blue":
        return "sky";
      default:
        return "purple";
    }
  };

  const currentAccent = normalizeAccent(data?.accentColor);

  const accentOptions = [
    { id: "purple", name: t('appearance.purple'), swatchVar: "--brand-purple" },
    { id: "pink", name: t('appearance.pink'), swatchVar: "--brand-pink" },
    { id: "caramel", name: t('appearance.caramel'), swatchVar: "--brand-caramel" },
    { id: "mint", name: t('appearance.mint'), swatchVar: "--brand-mint" },
    { id: "sky", name: t('appearance.sky'), swatchVar: "--brand-sky" },
    { id: "strawberry", name: t('appearance.strawberry'), swatchVar: "--brand-strawberry" },
  ] as const;

  const isBusy = updateAppearance.isPending;

  const onSelectTheme = async (nextTheme: "light" | "dark" | "system") => {
    setTheme(nextTheme);
    try {
      await updateAppearance.mutateAsync({ theme: nextTheme });
      toast.success("Appearance updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update appearance";
      toast.error(message);
    }
  };

  const onSelectAccent = async (accent: (typeof accentOptions)[number]["id"]) => {
    document.documentElement.dataset.accent = accent;
    try {
      await updateAppearance.mutateAsync({ accentColor: accent });
      toast.success("Accent updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update accent";
      toast.error(message);
    }
  };

  const themes = [
    {
      id: 'light',
      name: t('appearance.light'),
      description: t('appearance.lightDesc'),
      icon: Sun,
      preview: 'from-bg-primary to-bg-secondary'
    },
    {
      id: 'dark',
      name: t('appearance.dark'),
      description: t('appearance.darkDesc'),
      icon: Moon,
      preview: 'from-bg-secondary to-bg-primary'
    },
    {
      id: 'system',
      name: t('appearance.system'),
      description: t('appearance.systemDesc'),
      icon: Monitor,
      preview: 'from-bg-tertiary to-bg-secondary'
    }
  ];

  return (
    <div className="w-full">
      {/* Theme Selection */}
      <div className="px-12 py-8 border-b border-border-light/[0.01]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="text-lg font-medium text-fg-primary block mb-2">{t('appearance.themeLabel')}</label>
            <p className="text-base text-fg-tertiary">{t('appearance.themeDescription')}</p>
          </div>
          <div className="ml-12 w-96">
            <div className="space-y-1">
              {themes.map((themeOption) => {
                const Icon = themeOption.icon;
                const isActive = theme === themeOption.id;
                
                return (
                  <button
                    key={themeOption.id}
                    onClick={() => onSelectTheme(themeOption.id as "light" | "dark" | "system")}
                    disabled={isBusy}
                    className={`w-full flex items-center gap-4 px-6 py-4 border-b border-border-light/[0.02] transition-all text-left ${
                      isActive
                        ? "bg-bg-surface/20 text-fg-primary border-border-light/[0.08]"
                        : "hover:bg-bg-surface/10 hover:border-border-light/[0.05]"
                    } ${isBusy ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    <Icon className={isActive ? "text-accent-primary" : "text-fg-tertiary"} size={20} />
                    <div className="flex-1">
                      <div className="text-lg font-medium text-fg-primary">{themeOption.name}</div>
                      <div className="text-base text-fg-tertiary">{themeOption.description}</div>
                    </div>
                    {isActive && (
                      <Check size={18} className="text-accent-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Accent Color Selection */}
      <div className="px-12 py-8 border-b border-border-light/[0.01]">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="text-lg font-medium text-fg-primary block mb-2">{t('appearance.accentLabel')}</label>
            <p className="text-base text-fg-tertiary">{t('appearance.accentDescription')}</p>
          </div>
          <div className="ml-12 w-96">
            <div className="grid grid-cols-2 gap-1">
              {accentOptions.map((opt) => {
                const isActive = currentAccent === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectAccent(opt.id)}
                    className={`flex items-center gap-4 px-6 py-4 border-b border-border-light/[0.02] transition-all ${
                      isActive
                        ? "bg-bg-surface/20 text-fg-primary border-border-light/[0.08]"
                        : "hover:bg-bg-surface/10 hover:border-border-light/[0.05]"
                    } ${isBusy ? "opacity-70 cursor-not-allowed" : ""}`}
                  >
                    <span
                      className="h-5 w-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `rgb(var(${opt.swatchVar}))` }}
                      aria-hidden
                    />
                    <span className="text-lg font-medium text-fg-primary flex-1">{opt.name}</span>
                    {isActive && <Check size={16} className="text-accent-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Current Settings Display */}
      <div className="px-12 py-8">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-lg font-medium text-fg-primary block mb-2">{t('appearance.currentTheme')}</label>
          </div>
          <div className="ml-12 w-96">
            <div className="flex items-center gap-4 px-6 py-4 border border-border-light/[0.03] bg-bg-surface/10">
              <Palette size={20} className="text-accent-primary" />
              <span className="text-lg text-fg-secondary">
                {theme === 'system' 
                  ? `${t('appearance.system')} (${currentTheme === 'dark' ? t('appearance.dark') : t('appearance.light')})` 
                  : theme === 'dark' ? t('appearance.dark') : t('appearance.light')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}