// src/app/_components/sideNav.tsx
"use client";

import { 
  FileText, 
  Plus, 
  FolderOpen, 
  LayoutDashboard, 
  Calendar,
  FileEdit,
  FolderKanban,
  X
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

const FileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      <div className="fixed left-20 top-4 bg-white shadow-2xl rounded-xl p-3 z-50 w-64 border border-[#DDE3E9] animate-in slide-in-from-left-5 duration-200">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-[#DDE3E9]">
          <h4 className="text-sm font-bold text-[#222B32]">Create New</h4>
          <button onClick={onClose} className="text-[#59677C] hover:text-[#222B32]">
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-1">
          <Link 
            href="/create?action=new_project"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-[#222B32] hover:bg-[#9448F2]/5 rounded-lg transition-all group"
          >
            <div className="w-8 h-8 bg-[#9448F2]/10 rounded-lg flex items-center justify-center group-hover:bg-[#9448F2]/20">
              <FolderKanban size={16} className="text-[#9448F2]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Project</div>
              <div className="text-xs text-[#59677C]">New workspace</div>
            </div>
          </Link>

          <Link 
            href="/publish?action=new_event"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-[#222B32] hover:bg-[#80C49B]/5 rounded-lg transition-all group"
          >
            <div className="w-8 h-8 bg-[#80C49B]/10 rounded-lg flex items-center justify-center group-hover:bg-[#80C49B]/20">
              <Calendar size={16} className="text-[#80C49B]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Event</div>
              <div className="text-xs text-[#59677C]">Publish event</div>
            </div>
          </Link>

          <Link 
            href="/create?action=new_note"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 text-[#222B32] hover:bg-[#FFC53D]/5 rounded-lg transition-all group"
          >
            <div className="w-8 h-8 bg-[#FFC53D]/10 rounded-lg flex items-center justify-center group-hover:bg-[#FFC53D]/20">
              <FileEdit size={16} className="text-[#FFC53D]" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">Note</div>
              <div className="text-xs text-[#59677C]">Secure note</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
};

const NavTooltip = ({ text }: { text: string }) => (
  <div className="absolute left-full ml-2 px-3 py-2 bg-[#222B32] text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
    {text}
    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-[#222B32]"></div>
  </div>
);

export function SideNav() {
  const [isFilingMenuOpen, setIsFilingMenuOpen] = useState(false);

  return (
    <nav className="fixed left-0 top-0 h-full w-16 bg-white shadow-lg z-40 flex flex-col border-r border-[#DDE3E9]">
      
      {/* Logo */}
      <Link href="/" className="h-16 flex items-center justify-center border-b border-[#DDE3E9] hover:bg-[#FCFBF9] transition-colors">
        <div className="w-10 h-10 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-xl flex items-center justify-center shadow-md">
          <FileText size={22} className="text-white" />
        </div>
      </Link>

      {/* Navigation */}
      <div className="flex-1 py-4">
        
        <Link 
          href="/" 
          className="relative flex items-center justify-center w-full h-14 text-[#59677C] hover:text-[#9448F2] hover:bg-[#9448F2]/5 transition-all group"
        >
          <LayoutDashboard size={22} />
          <NavTooltip text="Dashboard" />
        </Link>
        
        <button 
          onClick={() => setIsFilingMenuOpen(!isFilingMenuOpen)}
          className={`relative flex items-center justify-center w-full h-14 transition-all group ${
            isFilingMenuOpen 
              ? 'text-[#9448F2] bg-[#9448F2]/10' 
              : 'text-[#59677C] hover:text-[#9448F2] hover:bg-[#9448F2]/5'
          }`}
        >
          <Plus size={22} />
          <NavTooltip text="Create" />
          {isFilingMenuOpen && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#9448F2] rounded-l-full"></div>
          )}
        </button>
        
        <Link 
          href="/create" 
          className="relative flex items-center justify-center w-full h-14 text-[#59677C] hover:text-[#9448F2] hover:bg-[#9448F2]/5 transition-all group"
        >
          <FolderKanban size={22} />
          <NavTooltip text="Workspace" />
        </Link>

        <Link 
          href="/publish" 
          className="relative flex items-center justify-center w-full h-14 text-[#59677C] hover:text-[#9448F2] hover:bg-[#9448F2]/5 transition-all group"
        >
          <Calendar size={22} />
          <NavTooltip text="Events" />
        </Link>
      </div>

      {/* Bottom */}
      <div className="border-t border-[#DDE3E9]">
        <Link 
          href="/create" 
          className="relative flex items-center justify-center w-full h-14 text-[#59677C] hover:text-[#9448F2] hover:bg-[#9448F2]/5 transition-all group"
        >
          <FolderOpen size={22} />
          <NavTooltip text="Files" />
        </Link>
      </div>

      <FileMenu 
        isOpen={isFilingMenuOpen} 
        onClose={() => setIsFilingMenuOpen(false)} 
      />
    </nav>
  );
}