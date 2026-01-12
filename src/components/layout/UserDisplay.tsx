"use client";

import { api } from "~/trpc/react";
import { ChevronDown, LogIn, LogOut, Users } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

type StoredAccount = {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  lastUsed: number;
};

export function UserDisplay() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const tSettings = useT("settings");
  const tOrg = useT("org");
  const [isOpen, setIsOpen] = useState(false);
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { status } = useSession();
  const enabled = status === "authenticated";

  const utils = api.useUtils();

  const { data: user, isLoading } = api.user.getCurrentUser.useQuery(undefined, {
    enabled,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!user?.email) return;

    const refreshAccounts = async () => {
      try {
        await fetch("/api/account-switch/register", { method: "POST" });
        const res = await fetch("/api/account-switch/list", { method: "GET" });
        const data = (await res.json()) as unknown;
        if (!data || typeof data !== "object") return;
        const accounts = (data as { accounts?: unknown }).accounts;
        if (!Array.isArray(accounts)) return;

        const normalized = accounts
          .filter((a): a is StoredAccount => {
            if (!a || typeof a !== "object") return false;
            const x = a as Partial<StoredAccount>;
            return (
              typeof x.userId === "string" &&
              typeof x.email === "string" &&
              typeof x.lastUsed === "number"
            );
          })
          .sort((a, b) => b.lastUsed - a.lastUsed);

        setStoredAccounts(normalized);
      } catch {
        // ignore
      }
    };

    void refreshAccounts();
  }, [user?.email]);

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
    await utils.settings.get.cancel();
    await utils.user.getCurrentUser.cancel();
    await utils.organization.getActive.cancel();
    await utils.organization.listMine.cancel();
    await signOut({ callbackUrl: "/" });
  };

  const handleSwitchAccount = async () => {
    await utils.settings.get.cancel();
    await utils.user.getCurrentUser.cancel();
    await utils.organization.getActive.cancel();
    await utils.organization.listMine.cancel();
    await signOut({ callbackUrl: "/?switchAccount=1" });
  };

  const handleSwitchToAccount = async (account: StoredAccount) => {
    await utils.settings.get.cancel();
    await utils.user.getCurrentUser.cancel();
    await utils.organization.getActive.cancel();
    await utils.organization.listMine.cancel();

    const result = await signIn("account-switch", {
      userId: account.userId,
      redirect: false,
    });

    if (result?.error) {
      const encoded = encodeURIComponent(account.email);
      await signOut({ callbackUrl: `/?switchAccount=1&email=${encoded}` });
      return;
    }

    window.location.href = "/";
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

  const otherAccounts = storedAccounts.filter((a) => a.email && a.email !== user.email);

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
          className="absolute right-0 mt-3 w-64 bg-bg-primary/95 rounded-2xl ios-card-elevated shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
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
              href="/orgs"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-fg-primary hover:bg-bg-secondary/60 rounded-xl transition-colors"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              <Users size={16} />
              {tOrg("switchOrg")}
            </a>

            {otherAccounts.length === 0 ? (
              <button
                onClick={handleSwitchAccount}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-fg-primary hover:bg-bg-secondary/60 rounded-xl transition-colors"
                role="menuitem"
              >
                <LogIn size={16} />
                {tSettings("security.addAccount")}
              </button>
            ) : (
              <div className="mt-1">
                <div className="px-3 pt-2 pb-1 text-xs font-medium text-fg-tertiary">
                  {tSettings("security.changeAccount")}
                </div>
                {otherAccounts.map((acct) => (
                  <button
                    key={acct.email}
                    onClick={() => handleSwitchToAccount(acct)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-fg-primary hover:bg-bg-secondary/60 rounded-xl transition-colors"
                    role="menuitem"
                  >
                    {acct.image ? (
                      <Image
                        src={acct.image}
                        alt={acct.name ?? acct.email}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-bg-tertiary/60" />
                    )}
                    <span className="truncate">{acct.name?.trim() ? acct.name : "Account"}</span>
                  </button>
                ))}

                <button
                  onClick={handleSwitchAccount}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-fg-primary hover:bg-bg-secondary/60 rounded-xl transition-colors"
                  role="menuitem"
                >
                  <LogIn size={16} />
                  {tSettings("security.addAccount")}
                </button>
              </div>
            )}

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