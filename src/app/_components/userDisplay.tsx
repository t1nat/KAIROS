// src/app/_components/userDisplay.tsx
"use client";

import { api } from "~/trpc/react";
import { ChevronDown, User as UserIcon, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function UserDisplay() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Optimized query configuration for instant updates
  const { data: user, isLoading } = api.user.getCurrentUser.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus (too aggressive)
    refetchOnMount: false, // Don't refetch on mount (we trust cache)
  });

  // Close dropdown when clicking outside
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
      <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-24 mb-1" />
          <div className="h-3 bg-slate-200 rounded w-32" />
        </div>
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
        className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name ?? "User"}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {user.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
        )}
        
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold text-slate-900">
            {user.name ?? "User"}
          </div>
          <div className="text-xs text-slate-600">
            {user.email}
          </div>
        </div>
        
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-50">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "User"}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-lg font-bold">
                  {user.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {user.name ?? "User"}
                </div>
                <div className="text-xs text-slate-600 truncate">
                  {user.email}
                </div>
              </div>
            </div>
            {user.bio && (
              <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>

          <div className="p-2">
            <a
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <UserIcon size={16} />
              Profile Settings
            </a>
            
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}