"use client";

import { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme } from "next-themes";

export function AppearanceSettings() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

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
                  onClick={() => setTheme(themeOption.id)}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    isActive
                      ? 'border-accent-primary bg-accent-primary/10'
                      : 'border-border-light/20 hover:border-border-medium/50 bg-bg-surface hover:bg-bg-elevated'
                  }`}
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