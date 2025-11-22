// src/app/_components/settings/appearanceSettings.tsx
"use client";

import { api } from "~/trpc/react";
import { useTheme } from "next-themes";
import { Palette, Check } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function AppearanceSettings() {
  const updateAppearance = api.settings.updateAppearance.useMutation();
  
  // FIX 1: Explicitly type the hook return to silence "Unsafe assignment" errors
  const { setTheme, theme, resolvedTheme } = useTheme() as {
    setTheme: (theme: string) => void;
    theme: string | undefined;
    resolvedTheme: string | undefined;
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    console.log("Switching to:", newTheme);
    
    // FIX 2: Removed manual DOM manipulation.
    // next-themes handles the class switching automatically.
    // Manually adding/removing classes here causes hydration errors and fights the library.
    setTheme(newTheme);
    
    updateAppearance.mutate({ theme: newTheme });
  };

  const themes: Array<{ value: Theme; label: string }> = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ];

  if (!mounted) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="animate-pulse">
          <div className="h-12 w-12 bg-slate-200 rounded-2xl mb-4"></div>
          <div className="h-6 w-48 bg-slate-200 rounded mb-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center">
          <Palette className="w-6 h-6 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Appearance
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Customize how your workspace looks
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Theme
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => handleThemeChange(themeOption.value)}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-200
                ${
                  theme === themeOption.value
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600"
                }
              `}
            >
              {theme === themeOption.value && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <span
                className={`
                text-lg font-medium
                ${
                  theme === themeOption.value
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-slate-700 dark:text-slate-300"
                }
              `}
              >
                {themeOption.label}
              </span>
            </button>
          ))}
        </div>
        
        {/* Debug info */}
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
          Current: {theme} | Resolved: {resolvedTheme}
        </div>
      </div>
    </div>
  );
}