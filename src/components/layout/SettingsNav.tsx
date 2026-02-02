"use client";

import Link from "next/link";
import { User, Bell, Shield, Globe, Palette } from "lucide-react";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

interface SettingsNavProps {
  activeSection: string;
  variant?: "card" | "embedded";
}

export function SettingsNav({ activeSection, variant = "card" }: SettingsNavProps) {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings.nav");
  
  const sections = [
    { id: "profile", label: t("profile"), icon: User },
    { id: "notifications", label: t("notifications"), icon: Bell },
    { id: "security", label: t("security"), icon: Shield },
    { id: "language", label: t("language"), icon: Globe },
    { id: "appearance", label: t("appearance"), icon: Palette },
  ];

  return (
    <nav className="h-full bg-transparent" aria-label="Settings">
      <div className="flex flex-col h-full">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <Link
              key={section.id}
              href={`/settings?section=${section.id}`}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-4 px-8 py-6 transition-all duration-200 ${
                isActive
                  ? "bg-gray-100/50 dark:bg-white/5 text-gray-900 dark:text-white border-l-2 border-gray-400 dark:border-gray-600"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Icon 
                size={20} 
                className={`transition-colors ${
                  isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                }`} 
              />
              <span className="font-medium text-base tracking-[-0.01em]">{section.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}