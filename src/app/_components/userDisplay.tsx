// src/app/_components/userDisplay.tsx

"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { useState } from "react";

export function UserDisplay() {
    const { data: sessionData, status } = useSession();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    if (status === "loading") {
        return (
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse"></div>
                <div className="hidden md:block w-24 h-4 bg-slate-200 rounded animate-pulse"></div>
            </div>
        );
    }
    
    if (sessionData?.user) {
        const { user } = sessionData;
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
        
        return (
            <div className="relative">
                {/* User Button */}
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all duration-300 border border-transparent hover:border-slate-200"
                >
                    {/* Avatar */}
                    {user.image ? (
                        <Image
                            src={user.image}
                            alt={user.name ?? "User"}
                            width={40}
                            height={40}
                            className="rounded-full object-cover ring-2 ring-slate-200"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-slate-200">
                            {initials}
                        </div>
                    )}

                    {/* Name (Hidden on mobile) */}
                    <div className="hidden md:block text-left">
                        <div className="text-sm font-semibold text-slate-900">
                            {user.name}
                        </div>
                        <div className="text-xs text-slate-500">
                            {user.email}
                        </div>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsMenuOpen(false)}
                        />
                        
                        {/* Menu */}
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in slide-in-from-top-5 duration-200">
                            {/* User Info */}
                            <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                                <div className="flex items-center gap-3">
                                    {user.image ? (
                                        <Image
                                            src={user.image}
                                            alt={user.name ?? "User"}
                                            width={48}
                                            height={48}
                                            className="rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold">
                                            {initials}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-900 truncate">
                                            {user.name}
                                        </div>
                                        <div className="text-sm text-slate-600 truncate">
                                            {user.email}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="py-2">
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        // Add profile navigation here if needed
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <User size={18} className="text-slate-500" />
                                    <span className="text-sm font-medium">My Profile</span>
                                </button>

                                <div className="border-t border-slate-200 my-2"></div>

                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        void signOut();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span className="text-sm font-medium">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
            <User size={16} />
            <span>Not signed in</span>
        </div>
    );
}