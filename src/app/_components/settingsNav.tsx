/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// src/app/_components/settingsNav.tsx
"use client";

import Link from "next/link";
import { 
  User, 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Lock,
  Database,
  Mail,
  type LucideIcon
} from "lucide-react";

const NAV_ITEM_BASE = "flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 rounded-lg font-medium";
const NAV_ITEM_ACTIVE = "bg-indigo-100 text-indigo-600";

interface SettingsNavProps {
  activeSection: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export function SettingsNav({ activeSection }: SettingsNavProps) {
  // FIXED: Explicitly type the array as NavItem[] to avoid "any" inference
  const navItems: readonly NavItem[] = [
    {
      id: "profile" as const,
      label: "Profile" as const,
      icon: User,
      description: "Personal information" as const
    },
    {
      id: "account" as const,
      label: "Account" as const,
      icon: Mail,
      description: "Account details" as const
    },
    {
      id: "notifications" as const,
      label: "Notifications" as const,
      icon: Bell,
      description: "Email & push" as const
    },
    {
      id: "security" as const,
      label: "Security" as const,
      icon: Shield,
      description: "Password & 2FA" as const
    },
    {
      id: "language" as const,
      label: "Language" as const,
      icon: Globe,
      description: "Language & region" as const
    },
    {
      id: "appearance" as const,
      label: "Appearance" as const,
      icon: Palette,
      description: "Theme & colors" as const
    },
    {
      id: "privacy" as const,
      label: "Privacy" as const,
      icon: Lock,
      description: "Privacy controls" as const
    },
    {
      id: "data" as const,
      label: "Data" as const,
      icon: Database,
      description: "Export & delete" as const
    }
  ] as const;

  return (
    <nav className="bg-white rounded-2xl shadow-lg border border-slate-200 p-4 sticky top-24">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <Link
              key={item.id}
              href={`/settings?section=${item.id}`}
              className={`${NAV_ITEM_BASE} ${isActive ? NAV_ITEM_ACTIVE : ''}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isActive ? 'bg-indigo-200' : 'bg-slate-100'
              }`}>
                <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-600'} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-slate-500">{item.description}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}