"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Home,
  FolderKanban,
  FileEdit,
  BarChart3,
  Users,
  Settings,
  Menu,
  X,
  Plus,
  MessageCircle,
  Calendar,
} from "lucide-react";

import { A1ChatWidgetOverlay } from "~/components/chat/A1ChatWidgetOverlay";

export function SideNav() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tOrg = useTranslations("org");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isA1WidgetOpen, setIsA1WidgetOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mobileNavId = "mobile-nav-menu";

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isMobileMenuOpen]);

  const action = searchParams?.get("action");

  const mainNavItems = [
    { href: "/", icon: Home, label: t("home") },
    { href: "/create", icon: Plus, label: t("create") },
    { href: "/projects", icon: FolderKanban, label: t("projects") },
    { href: "/create?action=new_note", icon: FileEdit, label: t("notes") },
    { href: "/progress", icon: BarChart3, label: t("progress") },
    { href: "/chat", icon: MessageCircle, label: "Chat" },
    { href: "/publish", icon: Calendar, label: t("events") },
  ];

  const profileItem = { href: "/orgs", icon: Users, label: tOrg("yourOrgs") };

  const settingsItem = { href: "/settings?section=profile", icon: Settings, label: t("settings") };

  const isItemActive = (href: string): boolean => {
    if (href === "/") {
      return pathname === "/";
    }
    if (href === "/create") {
      return pathname === "/create" && !action;
    }
    if (href === "/progress") {
      return pathname === "/progress";
    }
    if (href === "/chat") {
      return pathname === "/chat";
    }
    if (href === "/publish") {
      return pathname === "/publish";
    }
    if (href === "/projects") {
      return pathname === "/projects";
    }
    if (href.startsWith("/settings")) {
      return pathname === "/settings";
    }
    if (href === "/create?action=new_project") {
      return pathname === "/create" && action === "new_project";
    }
    if (href === "/create?action=new_note") {
      return pathname === "/create" && action === "new_note";
    }
    return false;
  };

  return (
    <>
      <A1ChatWidgetOverlay isOpen={isA1WidgetOpen} onClose={() => setIsA1WidgetOpen(false)} />

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-md shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg shadow-accent-primary/25">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <h1 className="text-lg font-semibold text-fg-primary font-display tracking-[-0.02em]">KAIROS</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-bg-secondary/60 rounded-lg transition-colors"
          aria-label={isMobileMenuOpen ? tCommon("close") : "Menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls={mobileNavId}
          title={isMobileMenuOpen ? tCommon("close") : "Menu"}
        >
          {isMobileMenuOpen ? (
            <X size={24} className="text-fg-primary" />
          ) : (
            <Menu size={24} className="text-fg-primary" />
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fadeIn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            id={mobileNavId}
            role="dialog"
            aria-label="Navigation"
            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-bg-primary z-50 shadow-2xl pt-16 animate-slideIn"
          >
            <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
              {mainNavItems.map((item) => {
                const isActive = isItemActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium ${
                      isActive
                        ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 dark:bg-fg-primary dark:text-bg-primary dark:ring-0 shadow-sm"
                        : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <Link
                href={profileItem.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary`}
                title={profileItem.label}
              >
                <profileItem.icon size={20} />
                <span>{profileItem.label}</span>
              </Link>

              <Link
                href={settingsItem.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium ${
                  pathname === "/settings"
                    ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 dark:bg-fg-primary dark:text-bg-primary dark:ring-0 shadow-sm"
                    : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
                }`}
                title={settingsItem.label}
              >
                <settingsItem.icon size={20} />
                <span>{settingsItem.label}</span>
              </Link>
              
              <div className="mt-6 pt-6">
                <p className="text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-3 px-4">
                  {t("quickActions")}
                </p>
                <Link
                  href="/create?action=new_project"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-accent-primary hover:bg-accent-primary/10 transition-colors shadow-sm font-medium"
                  title={t("newProject")}
                >
                  <Plus size={20} />
                  <span>{t("newProject")}</span>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 bg-bg-primary/95 backdrop-blur-md shadow-lg flex-col items-center py-8 gap-6 z-40" aria-label="Primary">
        <div className="flex flex-col items-center gap-6">
          {mainNavItems.map((item) => {
            const isActive = isItemActive(item.href);

            if (item.href === "/chat") {
              return (
                <button
                  key={item.href}
                  type="button"
                  aria-label={item.label}
                  onClick={() => setIsA1WidgetOpen(true)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative ${
                    isActive
                      ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 dark:bg-fg-primary dark:text-bg-primary dark:ring-0 shadow-sm"
                      : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
                  }`}
                  title={item.label}
                >
                  <item.icon size={20} />

                  <span className="absolute left-full ml-4 px-3 py-1.5 ios-card text-fg-primary text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative ${
                  isActive
                    ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 dark:bg-fg-primary dark:text-bg-primary dark:ring-0 shadow-sm"
                    : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
                }`}
                title={item.label}
              >
                <item.icon size={20} />

                <span className="absolute left-full ml-4 px-3 py-1.5 ios-card text-fg-primary text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto">
          <Link
            href={settingsItem.href}
            aria-label={settingsItem.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative ${
              pathname === "/settings"
                ? "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/25 dark:bg-fg-primary dark:text-bg-primary dark:ring-0 shadow-sm"
                : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
            }`}
            title={settingsItem.label}
          >
            <settingsItem.icon size={20} />
            <span className="absolute left-full ml-4 px-3 py-1.5 ios-card text-fg-primary text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
              {settingsItem.label}
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}