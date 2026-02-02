"use client";

import { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export function AppearanceSettings() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings");
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
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
      <div className="w-full h-full overflow-y-auto bg-gray-50/50 dark:bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse">
            <div className="h-[60px] bg-white/20 dark:bg-[#1a1a1a]/30 rounded-lg mx-4 mb-2"></div>
            <div className="h-[60px] bg-white/20 dark:bg-[#1a1a1a]/30 rounded-lg mx-4 mb-2"></div>
            <div className="h-[60px] bg-white/20 dark:bg-[#1a1a1a]/30 rounded-lg mx-4"></div>
          </div>
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
    } catch (e) {
      // Error is handled silently
    }
  };

  const onSelectAccent = async (accent: (typeof accentOptions)[number]["id"]) => {
    document.documentElement.dataset.accent = accent;
    try {
      await updateAppearance.mutateAsync({ accentColor: accent });
    } catch (e) {
      // Error is handled silently
    }
  };

  const themes = [
    {
      id: 'light',
      name: t('appearance.light'),
      icon: Sun,
    },
    {
      id: 'dark',
      name: t('appearance.dark'),
      icon: Moon,
    },
    {
      id: 'system',
      name: t('appearance.system'),
      icon: Monitor,
    }
  ];

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50/50 dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif] mb-2">
            {t("appearance.title")}
          </h1>
          <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
            {t("appearance.subtitle")}
          </p>
        </div>

        {/* Theme Selection Section */}
        <div className="mb-3">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
            {themes.map((themeOption, index) => {
              const Icon = themeOption.icon;
              const isActive = theme === themeOption.id;
              const isLast = index === themes.length - 1;
              
              return (
                <div key={themeOption.id} className="relative">
                  <button
                    onClick={() => onSelectTheme(themeOption.id as "light" | "dark" | "system")}
                    disabled={isBusy}
                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50/60 dark:active:bg-gray-900/40 transition-colors ${
                      isBusy ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isActive 
                          ? "bg-blue-500/10 dark:bg-blue-500/20" 
                          : "bg-gray-100/60 dark:bg-gray-800/60"
                      }`}>
                        <Icon 
                          size={16} 
                          className={isActive 
                            ? "text-blue-600 dark:text-blue-400" 
                            : "text-gray-500 dark:text-gray-400"
                          } 
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </div>
                      <span className={`text-[16px] leading-[1.25] tracking-[-0.01em] ${
                        isActive 
                          ? "text-blue-600 dark:text-blue-400 font-[510]" 
                          : "text-gray-900 dark:text-gray-100 font-normal"
                      } font-[system-ui,Kairos,sans-serif]`}>
                        {themeOption.name}
                      </span>
                    </div>
                    {isActive && (
                      <Check 
                        size={18} 
                        className="text-blue-600 dark:text-blue-400" 
                        strokeWidth={2.8}
                      />
                    )}
                  </button>
                  {!isLast && (
                    <div className="absolute bottom-0 left-[56px] right-4 h-[0.5px] bg-gray-200/50 dark:bg-gray-800/50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Accent Color Section */}
        <div className="mb-3">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
            {accentOptions.map((opt, index) => {
              const isActive = currentAccent === opt.id;
              const isLast = index === accentOptions.length - 1;
              
              return (
                <div key={opt.id} className="relative">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectAccent(opt.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-gray-50/60 dark:active:bg-gray-900/40 transition-colors ${
                      isBusy ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-7 h-7 rounded-full border border-gray-300/50 dark:border-gray-700/50 shadow-xs"
                        style={{ backgroundColor: `rgb(var(${opt.swatchVar}))` }}
                        aria-hidden
                      />
                      <span className={`text-[16px] leading-[1.25] tracking-[-0.01em] ${
                        isActive 
                          ? "text-blue-600 dark:text-blue-400 font-[510]" 
                          : "text-gray-900 dark:text-gray-100 font-normal"
                      } font-[system-ui,Kairos,sans-serif]`}>
                        {opt.name}
                      </span>
                    </div>
                    {isActive && (
                      <Check 
                        size={18} 
                        className="text-blue-600 dark:text-blue-400" 
                        strokeWidth={2.8}
                      />
                    )}
                  </button>
                  {!isLast && (
                    <div className="absolute bottom-0 left-[56px] right-4 h-[0.5px] bg-gray-200/50 dark:bg-gray-800/50" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Theme Display */}
        <div className="mb-3">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                  <Palette size={16} className="text-gray-500 dark:text-gray-400" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                    Current Theme
                  </div>
                  <div className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510]">
                    {theme === 'system' 
                      ? `System (${currentTheme === 'dark' ? 'Dark' : 'Light'})` 
                      : theme === 'dark' ? 'Dark' : 'Light'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Spacing */}
        <div className="h-6"></div>
      </div>
    </div>
  );
}
