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
    <nav className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-2">
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <Link
              key={section.id}
              href={`/settings?section=${section.id}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-[#A343EC] text-white"
                  : "text-[#E4DEEA] hover:bg-white/5"
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