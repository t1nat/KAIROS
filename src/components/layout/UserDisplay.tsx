"use client";

import { api } from "~/trpc/react";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export function UserDisplay() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const tSettings = useT("settings");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: user, isLoading } = api.user.getCurrentUser.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="h-4 bg-bg-tertiary/60 rounded w-24" />
          <div className="h-3 bg-bg-tertiary/60 rounded w-32" />
        </div>
        <div className="w-8 h-8 bg-bg-tertiary/60 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 group rounded-xl focus-visible:outline-none"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <div className="hidden sm:flex flex-col items-end">
          <div className="text-sm font-medium text-fg-primary group-hover:text-fg-primary transition-colors">
            {user.name ?? "User"}
          </div>
          <div className="text-xs text-fg-secondary group-hover:text-fg-primary transition-colors">
            {user.email}
          </div>
        </div>
        
        {user.image ? (
          <Image src={user.image} alt={user.name ?? "User"} width={32} height={32} className="w-8 h-8 rounded-full object-cover ring-2 ring-border-light/20 group-hover:ring-accent-primary/50 transition-all" />
        ) : (
          <div className="w-8 h-8 bg-accent-primary rounded-full flex items-center justify-center text-white text-sm font-bold group-hover:bg-accent-secondary transition-colors">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
        )}
        
        <ChevronDown 
          size={16} 
          className={`text-fg-secondary group-hover:text-fg-primary transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-3 w-64 bg-bg-primary/95 rounded-2xl border border-border-light/20 shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
          role="menu"
          aria-label={tSettings("title")}
        >
          <div className="p-4 border-b border-border-light/20 bg-bg-secondary/40">
            <div className="flex items-center gap-3">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-border-light/20"
                />
              ) : (
                <div className="w-12 h-12 bg-accent-primary rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-fg-primary truncate">
                  {user.name ?? "User"}
                </div>
                <div className="text-xs text-fg-secondary truncate">
                  {user.email}
                </div>
              </div>
            </div>
            {user.bio && (
              <p className="text-xs text-fg-secondary mt-2 line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>

          <div className="p-2">
            <a
              href="/settings"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg-primary hover:bg-bg-secondary/60 rounded-xl transition-colors"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                />
              </svg>
              {tSettings("profile.title")}
            </a>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-accent-primary hover:bg-accent-primary/10 rounded-xl transition-colors"
              role="menuitem"
            >
              <LogOut size={16} />
              {tSettings("security.signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}