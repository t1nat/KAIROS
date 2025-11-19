// src/app/_components/sideNav.tsx
"use client";

import { 
  FileText, 
  Plus, 
  FolderOpen, 
  LayoutDashboard, 
  Settings, 
  FolderKanban,
  Calendar,
  FileEdit
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";

// --- Professional Design System ---
const NAV_BG = "bg-slate-900";
const NAV_ITEM_BASE = "relative flex items-center justify-center w-full h-14 text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-300 group";
const NAV_ITEM_ACTIVE = "text-indigo-400 bg-slate-800";
const SUBMENU_BG = "bg-white";
const SUBMENU_ITEM = "flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all duration-200 rounded-lg";

// --- Sub-Menu Component ---
const FileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop to close menu */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="fixed left-20 top-4 bg-white shadow-2xl rounded-xl p-3 z-50 w-64 border border-slate-200 animate-in slide-in-from-left-5 duration-200">
        <div className="space-y-1">
          <div className="px-3 py-2">
            <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Create New</h4>
          </div>
          
          {/* NEW PROJECT BUTTON */}
          <Link 
            href="/create?action=new_project"
            onClick={onClose}
            className={SUBMENU_ITEM}
          >
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FolderKanban size={18} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium">New Project</div>
              <div className="text-xs text-slate-500">Start a new project workspace</div>
            </div>
          </Link>

          {/* NEW EVENT BUTTON */}
          <Link 
            href="/publish?action=new_event"
            onClick={onClose}
            className={SUBMENU_ITEM}
          >
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium">New Event</div>
              <div className="text-xs text-slate-500">Create and publish an event</div>
            </div>
          </Link>

          {/* NEW NOTE/DOCUMENT BUTTON */}
          <Link 
            href="/create?action=new_note"
            onClick={onClose}
            className={SUBMENU_ITEM}
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileEdit size={18} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium">New Note</div>
              <div className="text-xs text-slate-500">Create a secure note</div>
            </div>
          </Link>
          
          <div className="my-2 border-t border-slate-200"></div>
          
          <div className="px-3 py-2">
            <h4 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Browse</h4>
          </div>
          
          <Link 
            href="/create"
            onClick={onClose}
            className={SUBMENU_ITEM}
          >
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <FolderOpen size={18} className="text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium">My Workspace</div>
              <div className="text-xs text-slate-500">View all your work</div>
            </div>
          </Link>
        </div>
      </div>
    </>
  );
};

// --- Tooltip Component ---
const NavTooltip = ({ text }: { text: string }) => (
  <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
    {text}
    <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-slate-800"></div>
  </div>
);

// --- Main SideNav Component ---
export function SideNav() {
  const [isFilingMenuOpen, setIsFilingMenuOpen] = useState(false);

  return (
    <nav className={`fixed left-0 top-0 h-full w-16 ${NAV_BG} shadow-xl z-40 flex flex-col border-r border-slate-800`}>
      
      {/* Logo Area */}
      <Link href="/" className="h-16 flex items-center justify-center border-b border-slate-800 hover:bg-slate-800 transition-colors">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
          <FileText size={24} className="text-white" />
        </div>
      </Link>

      {/* Navigation Items */}
      <div className="flex-1 py-4">
        
        {/* Dashboard */}
        <Link href="/" className={NAV_ITEM_BASE} title="Dashboard">
          <LayoutDashboard size={22} />
          <NavTooltip text="Dashboard" />
        </Link>
        
        {/* Create Menu Toggle */}
        <button 
          onClick={() => setIsFilingMenuOpen(!isFilingMenuOpen)}
          className={`${NAV_ITEM_BASE} ${isFilingMenuOpen ? NAV_ITEM_ACTIVE : ''}`}
          title="Create"
        >
          <Plus size={22} />
          <NavTooltip text="Create New" />
          {isFilingMenuOpen && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full"></div>
          )}
        </button>
        
        {/* Browse Workspace */}
        <Link href="/create" className={NAV_ITEM_BASE} title="Workspace">
          <FolderKanban size={22} />
          <NavTooltip text="My Workspace" />
        </Link>

        {/* Events */}
        <Link href="/publish" className={NAV_ITEM_BASE} title="Events">
          <Calendar size={22} />
          <NavTooltip text="Events" />
        </Link>
      </div>

      {/* Bottom Items */}
      <div className="border-t border-slate-800">
        <Link href="/settings" className={NAV_ITEM_BASE} title="Settings">
          <Settings size={22} />
          <NavTooltip text="Settings" />
        </Link>
      </div>

      {/* File Menu */}
      <FileMenu 
        isOpen={isFilingMenuOpen} 
        onClose={() => setIsFilingMenuOpen(false)} 
      />
    </nav>
  );
}