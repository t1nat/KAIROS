"use client";

import { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { useToast } from "~/components/providers/ToastProvider";

export function AppearanceSettings() {
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
      <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
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
    { id: "purple", name: "Purple", swatchVar: "--brand-purple" },
    { id: "pink", name: "Pink", swatchVar: "--brand-pink" },
    { id: "caramel", name: "Caramel", swatchVar: "--brand-caramel" },
    { id: "mint", name: "Mint", swatchVar: "--brand-mint" },
    { id: "sky", name: "Sky", swatchVar: "--brand-sky" },
    { id: "strawberry", name: "Strawberry", swatchVar: "--brand-strawberry" },
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
      name: 'Light',
      description: 'Bright and clean interface',
      icon: Sun,
      preview: 'from-bg-primary to-bg-secondary'
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes',
      icon: Moon,
      preview: 'from-bg-secondary to-bg-primary'
    },
    {
      id: 'system',
      name: 'System',
      description: 'Match your device settings',
      icon: Monitor,
      preview: 'from-bg-tertiary to-bg-secondary'
    }
  ];

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <Palette className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">Appearance</h2>
          <p className="text-sm text-fg-secondary">Customize how Kairos looks</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-fg-secondary mb-4">Theme</h3>
          <div className="grid gap-4">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon;
              const isActive = theme === themeOption.id;
              
              return (
                <button
                  key={themeOption.id}
                  onClick={() => onSelectTheme(themeOption.id as "light" | "dark" | "system")}
                  disabled={isBusy}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border-light/20 hover:border-border-medium/50 bg-bg-surface hover:bg-bg-elevated'
                  } ${isBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${themeOption.preview} flex items-center justify-center shadow-lg`}>
                    <Icon className={isActive ? "text-accent-primary" : "text-fg-secondary"} size={24} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-fg-primary mb-1">
                      {themeOption.name}
                    </div>
                    <div className="text-sm text-fg-secondary">
                      {themeOption.description}
                    </div>
                  </div>

                  {isActive && (
                    <div className="w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-border-light/20">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-fg-secondary mb-4">Accent</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {accentOptions.map((opt) => {
                const isActive = currentAccent === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSelectAccent(opt.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'border-accent-primary bg-accent-primary/10'
                        : 'border-border-light/20 bg-bg-surface hover:bg-bg-elevated hover:border-border-medium/50'
                    } ${isBusy ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: `rgb(var(${opt.swatchVar}))` }}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-fg-primary">{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-bg-surface rounded-xl border border-border-light/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-accent-primary/15 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Palette size={16} className="text-accent-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-fg-primary mb-1">Current Theme</h4>
                <p className="text-sm text-fg-secondary">
                  {theme === 'system' 
                    ? `System (${currentTheme === 'dark' ? 'Dark' : 'Light'})` 
                    : theme === 'dark' ? 'Dark' : 'Light'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}