// src/app/_components/appearanceSettings.tsx
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
      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
            <Palette className="text-[#A343EC]" size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#FBF9F5]">Appearance</h2>
            <p className="text-sm text-[#E4DEEA]">Customize how Kairos looks</p>
          </div>
        </div>
        <div className="animate-pulse">
          <div className="h-20 bg-white/5 rounded-xl mb-4"></div>
          <div className="h-20 bg-white/5 rounded-xl mb-4"></div>
          <div className="h-20 bg-white/5 rounded-xl"></div>
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
      preview: 'from-slate-50 to-slate-100'
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes',
      icon: Moon,
      preview: 'from-[#181F25] to-[#0F172A]'
    },
    {
      id: 'system',
      name: 'System',
      description: 'Match your device settings',
      icon: Monitor,
      preview: 'from-slate-300 to-slate-700'
    }
  ];

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
          <Palette className="text-[#A343EC]" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#FBF9F5]">Appearance</h2>
          <p className="text-sm text-[#E4DEEA]">Customize how Kairos looks</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#E4DEEA] mb-4">Theme</h3>
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
                      ? 'border-[#A343EC] bg-[#A343EC]/10'
                      : 'border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${themeOption.preview} flex items-center justify-center shadow-lg`}>
                    <Icon className={isActive ? "text-[#A343EC]" : "text-[#E4DEEA]"} size={24} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-[#FBF9F5] mb-1">
                      {themeOption.name}
                    </div>
                    <div className="text-sm text-[#E4DEEA]">
                      {themeOption.description}
                    </div>
                  </div>

                  {isActive && (
                    <div className="w-6 h-6 bg-[#A343EC] rounded-full flex items-center justify-center">
                      <Check size={16} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-white/10">
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-[#A343EC]/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Palette size={16} className="text-[#A343EC]" />
              </div>
              <div>
                <h4 className="font-semibold text-[#FBF9F5] mb-1">Current Theme</h4>
                <p className="text-sm text-[#E4DEEA]">
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