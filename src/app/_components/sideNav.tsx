// src/app/_components/sideNav.tsx
"use client";

import {  
  Plus, 
  LayoutDashboard, 
  Calendar,
  FileEdit,
  FolderKanban,
  X,
  Settings,
  Zap
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// Sub-Menu Component
const FileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      <div className="fixed left-20 top-4 bg-[#181F25] border border-white/10 shadow-2xl rounded-xl p-3 z-50 w-64 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-white/10">
          <h4 className="text-sm font-bold text-[#FBF9F5]">Create New</h4>
          <button onClick={onClose} className="text-[#E4DEEA] hover:text-[#FBF9F5] p-1 hover:bg-white/5 rounded transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-1">
          <Link 
            href="/create?action=new_project"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-all group"
          >
            <div className="w-8 h-8 bg-[#A343EC]/20 rounded-lg flex items-center justify-center group-hover:bg-[#A343EC]/30 transition-colors">
              <FolderKanban size={16} className="text-[#A343EC]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Project</div>
              <div className="text-xs text-[#E4DEEA]">New workspace</div>
            </div>
          </Link>

          <Link 
            href="/publish?action=new_event"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-all group"
          >
            <div className="w-8 h-8 bg-[#80C49B]/20 rounded-lg flex items-center justify-center group-hover:bg-[#80C49B]/30 transition-colors">
              <Calendar size={16} className="text-[#80C49B]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Event</div>
              <div className="text-xs text-[#E4DEEA]">Publish event</div>
            </div>
          </Link>

          <Link 
            href="/create?action=new_note"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-all group"
          >
            <div className="w-8 h-8 bg-[#F8D45E]/20 rounded-lg flex items-center justify-center group-hover:bg-[#F8D45E]/30 transition-colors">
              <FileEdit size={16} className="text-[#F8D45E]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Note</div>
              <div className="text-xs text-[#E4DEEA]">Secure note</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
};

// Tooltip Component
const NavTooltip = ({ text }: { text: string }) => (
  <div className="absolute left-full ml-2 px-3 py-2 bg-[#181F25] border border-white/10 text-[#FBF9F5] text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-xl">
    {text}
    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-[#181F25]"></div>
  </div>
);

export function SideNav() {
  const [isFilingMenuOpen, setIsFilingMenuOpen] = useState(false);

  return (
    <nav className="fixed left-0 top-0 h-full w-16 bg-[#181F25] border-r border-white/10 shadow-xl z-40 flex flex-col">
      
      {/* Logo Area */}
      <Link href="/" className="h-16 flex items-center justify-center border-b border-white/10 hover:bg-white/5 transition-colors group">
        <div className="w-10 h-10 bg-gradient-to-br from-[#A343EC] to-[#9448F2] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Zap size={24} className="text-white" />
        </div>
      </Link>

      {/* Navigation */}
      <div className="flex-1 py-4">
        
        <Link 
          href="/" 
          className="relative flex items-center justify-center w-full h-14 text-[#E4DEEA] hover:text-[#A343EC] hover:bg-white/5 transition-all group"
        >
          <LayoutDashboard size={26} />
          <NavTooltip text="Dashboard" />
        </Link>
        
        <button 
          onClick={() => setIsFilingMenuOpen(!isFilingMenuOpen)}
          className={`relative flex items-center justify-center w-full h-14 transition-all group ${
            isFilingMenuOpen 
              ? 'text-[#A343EC] bg-white/5' 
              : 'text-[#E4DEEA] hover:text-[#A343EC] hover:bg-white/5'
          }`}
        >
          <Plus size={26} />
          <NavTooltip text="Create" />
          {isFilingMenuOpen && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#A343EC] rounded-l-full"></div>
          )}
        </button>
        
        <Link 
          href="/create" 
          className="relative flex items-center justify-center w-full h-14 text-[#E4DEEA] hover:text-[#80C49B] hover:bg-white/5 transition-all group"
        >
          <FolderKanban size={26} />
          <NavTooltip text="Workspace" />
        </Link>

        <Link 
          href="/publish" 
          className="relative flex items-center justify-center w-full h-14 text-[#E4DEEA] hover:text-[#F8D45E] hover:bg-white/5 transition-all group"
        >
          <Calendar size={26} />
          <NavTooltip text="Events" />
        </Link>
      </div>

      {/* Bottom Items */}
      <div className="border-t border-white/10">
        <Link 
          href="/settings" 
          className="relative flex items-center justify-center w-full h-14 text-[#E4DEEA] hover:text-[#A343EC] hover:bg-white/5 transition-all group"
          title="Settings"
        >
          <Settings size={26} />
          <NavTooltip text="Settings" />
        </Link>
      </div>

      <FileMenu 
        isOpen={isFilingMenuOpen} 
        onClose={() => setIsFilingMenuOpen(false)} 
      />
    </nav>
  );
}