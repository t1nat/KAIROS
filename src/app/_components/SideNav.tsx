"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FolderKanban, 
  FileEdit, 
  Menu,
  X,
  Plus
} from "lucide-react";

export function SideNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const mobileNavId = useId();

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

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create?action=new_project", icon: FolderKanban, label: "Projects" },
    { href: "/create?action=new_note", icon: FileEdit, label: "Notes" },
  ];

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-bg-primary/95 backdrop-blur-md border-b border-border-light/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg shadow-accent-primary/25">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <h1 className="text-lg font-bold text-fg-primary font-faustina">KAIROS</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-bg-secondary/60 rounded-lg transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls={mobileNavId}
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
            className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-bg-primary z-50 border-r border-border-light/20 pt-16 animate-slideIn"
          >
            <nav className="flex flex-col gap-1 p-3" aria-label="Primary">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '?');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors font-medium ${
                      isActive
                        ? "bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/25"
                        : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-3 px-4">
                  Quick Actions
                </p>
                <Link
                  href="/create?action=new_project"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-accent-primary hover:bg-accent-primary/10 transition-colors border border-accent-primary/30 font-medium"
                >
                  <Plus size={20} />
                  <span>New Project</span>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}

      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 bg-bg-primary border-r border-border-light/20 flex-col items-center py-8 gap-6 z-40" aria-label="Primary">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '?');
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative ${
                isActive
                  ? "bg-gradient-to-br from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/25"
                  : "text-fg-secondary hover:bg-bg-secondary/60 hover:text-fg-primary"
              }`}
              title={item.label}
            >
              <item.icon size={20} />
              
              <span className="absolute left-full ml-4 px-3 py-1.5 bg-bg-primary text-fg-primary text-sm rounded-lg border border-border-light/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {item.label}
              </span>
            </Link>
          );
        })}
      </aside>
    </>
  );
}