"use client";

import Link from "next/link";
import { User, Bell, Shield, Globe, Palette } from "lucide-react";

interface SettingsNavProps {
  activeSection: string;
}

export function SettingsNav({ activeSection }: SettingsNavProps) {
  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "language", label: "Language", icon: Globe },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  return (
    <nav className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-2" aria-label="Settings">
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <Link
              key={section.id}
              href={`/settings?section=${section.id}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive
                  ? "bg-accent-primary text-white"
                  : "text-fg-secondary hover:bg-bg-secondary/60"
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