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
    <nav
      className={
        variant === "embedded"
          ? "p-2"
          : "bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-2"
      }
      aria-label="Settings"
    >
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <Link
              key={section.id}
              href={`/settings?section=${section.id}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                isActive
                  ? "bg-accent-primary/10 text-accent-primary border-accent-primary/30 shadow-sm"
                  : "text-fg-secondary border-transparent hover:bg-bg-secondary/60"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{section.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}