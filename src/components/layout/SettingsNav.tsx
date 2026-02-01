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
              className={`group flex items-center gap-4 px-8 py-6 border-b border-border-light/[0.02] transition-all duration-200 ${
                isActive
                  ? "bg-bg-surface/20 text-fg-primary border-border-light/[0.06]"
                  : "text-fg-secondary hover:bg-bg-surface/10 hover:text-fg-primary hover:border-border-light/[0.04]"
              }`}
            >
              <Icon 
                size={20} 
                className={`transition-colors ${
                  isActive ? "text-accent-primary" : "text-fg-tertiary group-hover:text-fg-secondary"
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