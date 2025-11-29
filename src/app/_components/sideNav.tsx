"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  FolderKanban, 
  FileEdit, 
  Calendar,
  Menu,
  X,
  Plus
} from "lucide-react";

export function SideNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/create?action=new_project", icon: FolderKanban, label: "Projects" },
    { href: "/create?action=new_note", icon: FileEdit, label: "Notes" },
  ];

  return (
    <>
      {/* Mobile Header - Only visible on mobile/tablet */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#181F25]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#A343EC] to-[#9448F2] flex items-center justify-center shadow-lg shadow-[#A343EC]/30">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <h1 className="text-lg font-bold text-[#FBF9F5] font-faustina">KAIROS</h1>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X size={24} className="text-[#FBF9F5]" />
          ) : (
            <Menu size={24} className="text-[#FBF9F5]" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-[#0F1115] z-50 border-r border-white/10 pt-16 animate-in slide-in-from-left duration-300">
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '?');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium ${
                      isActive
                        ? "bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white shadow-lg shadow-[#A343EC]/30"
                        : "text-[#E4DEAA] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Quick Actions */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-semibold text-[#E4DEAA] uppercase tracking-wider mb-3 px-4">
                  Quick Actions
                </p>
                <Link
                  href="/create?action=new_project"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#A343EC] hover:bg-[#A343EC]/10 transition-all border border-[#A343EC]/30 font-medium"
                >
                  <Plus size={20} />
                  <span>New Project</span>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}

      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 bg-[#0F1115] border-r border-white/5 flex-col items-center py-8 gap-6 z-40">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '?');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative ${
                isActive
                  ? "bg-gradient-to-br from-[#A343EC] to-[#9448F2] text-white shadow-lg shadow-[#A343EC]/30"
                  : "text-[#E4DEAA] hover:bg-white/5 hover:text-white"
              }`}
              title={item.label}
            >
              <item.icon size={20} />
              
              {/* Tooltip on hover */}
              <span className="absolute left-full ml-4 px-3 py-1.5 bg-[#0F1115] text-[#FBF9F5] text-sm rounded-lg border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                {item.label}
              </span>
            </Link>
          );
        })}
      </aside>
    </>
  );
}