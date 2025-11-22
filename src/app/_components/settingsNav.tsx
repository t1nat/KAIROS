// src/app/_components/settingsNav.tsx
"use client";

import Link from "next/link";
import { 
  User, 
  Mail, 
  Bell, 
  Shield, 
  Globe, 
  Palette
} from "lucide-react";

interface SettingsNavProps {
  activeSection: string;
}

export function SettingsNav({ activeSection }: SettingsNavProps) {
  const sections = [
    {
      id: "profile",
      name: "Profile",
      description: "Personal information",
      icon: User,
      color: "text-[#A343EC]",
      bgColor: "bg-[#A343EC]/20"
    },
    {
      id: "account",
      name: "Account",
      description: "Account details",
      icon: Mail,
      color: "text-[#80C49B]",
      bgColor: "bg-[#80C49B]/20"
    },
    {
      id: "notifications",
      name: "Notifications",
      description: "Email & push",
      icon: Bell,
      color: "text-[#F8D45E]",
      bgColor: "bg-[#F8D45E]/20"
    },
    {
      id: "security",
      name: "Security",
      description: "Password & 2FA",
      icon: Shield,
      color: "text-[#A343EC]",
      bgColor: "bg-[#A343EC]/20"
    },
    {
      id: "language",
      name: "Language",
      description: "Language & region",
      icon: Globe,
      color: "text-[#80C49B]",
      bgColor: "bg-[#80C49B]/20"
    },
    {
      id: "appearance",
      name: "Appearance",
      description: "Theme & colors",
      icon: Palette,
      color: "text-[#F8D45E]",
      bgColor: "bg-[#F8D45E]/20"
    }
  ];

  return (
    <nav className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-3">
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <Link
              key={section.id}
              href={`/settings?section=${section.id}`}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-white/10 border border-white/10'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className={`w-8 h-8 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={section.color} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${isActive ? 'text-[#FBF9F5]' : 'text-[#E4DEEA]'}`}>
                  {section.name}
                </div>
                <div className="text-xs text-[#59677C]">
                  {section.description}
                </div>
              </div>
              {isActive && (
                <div className="w-2 h-2 bg-[#A343EC] rounded-full"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}