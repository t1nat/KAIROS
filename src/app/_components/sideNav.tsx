// src/app/_components/sideNav.tsx
"use client";

import { FileText, Plus, FolderOpen, LayoutDashboard, Settings, FolderKanban } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// --- Sub-Menu Component ---
const FileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute left-16 top-4 bg-white shadow-xl rounded-lg p-2 z-50 w-48 text-[#140C00]">
      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1 px-2">Create</h4>
      
      {/* NEW PROJECT BUTTON */}
      <Link 
        href="/create?action=new_project"
        onClick={onClose}
        className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
      >
        <FolderKanban size={16} /> New Project
      </Link>

      {/* NEW NOTE/DOCUMENT BUTTON */}
      <Link 
        href="/create?action=new_note"
        onClick={onClose}
        className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
      >
        <Plus size={16} /> New Note
      </Link>
      
      <hr className="my-2 border-gray-200" />
      
      <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1 px-2">Open</h4>
      
      <Link 
        href="/create"
        onClick={onClose}
        className="w-full flex items-center gap-2 p-2 text-sm rounded-md hover:bg-gray-100 transition-colors"
      >
        <FolderOpen size={16} /> Browse Workspace
      </Link>
    </div>
  );
};
// --- End Sub-Menu Component ---

export function SideNav() {
  const [isFilingMenuOpen, setIsFilingMenuOpen] = useState(false);

  // General Icon Button Styling
  const IconClass = "w-full p-3 flex justify-center text-[#140C00] hover:bg-gray-200 transition-colors relative";
  
  return (
    // Fixed Sidebar Container
    <nav className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200 shadow-lg z-30 flex flex-col items-center py-4 space-y-4">
      
      {/* 1. Filing Icon (with Toggle) */}
      <div className="relative">
        <button 
          onClick={() => setIsFilingMenuOpen(!isFilingMenuOpen)}
          className={`${IconClass} ${isFilingMenuOpen ? 'bg-gray-200' : ''}`}
          title="Create Menu"
        >
          <FileText size={24} />
        </button>
        <FileMenu 
          isOpen={isFilingMenuOpen} 
          onClose={() => setIsFilingMenuOpen(false)} 
        />
      </div>

      {/* 2. Dashboard Icon (Link to Home) */}
      <Link href="/" className={IconClass} title="Dashboard">
        <LayoutDashboard size={24} />
      </Link>
      
      {/* 3. Settings Icon */}
      <Link href="/settings" className={IconClass} title="Settings">
        <Settings size={24} />
      </Link>

      {/* Add more icons here */}
    </nav>
  );
}