// src/app/HomeClient.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import { UserDisplay } from "./_components/userDisplay";
import { SignInModal } from "./_components/signInModal"; // Import the modal
import { ChevronRight, ExternalLink, LogIn, LogOut, Code, Globe } from "lucide-react"; // Import icons for elegance

// Define a type for the session data passed from the server
interface SessionData {
    user?: { name?: string | null } | null;
}

// Monochromatic/Elegant Style Constants
const BG_PRIMARY = "bg-gray-50"; // Light background
const TEXT_DARK = "text-gray-900"; // Primary text
const TEXT_SUBTLE = "text-gray-600"; // Secondary text
const BORDER_LIGHT = "border-gray-200";
const BUTTON_PRIMARY_STYLE = `rounded-lg bg-gray-900 px-8 py-3 text-lg font-semibold text-white transition hover:bg-gray-700 shadow-lg`;
const LINK_ACCENT_STYLE = `flex items-center gap-2 text-md font-medium ${TEXT_DARK} border-b border-gray-300 hover:border-gray-900 transition-colors duration-200`;


// This component receives server-fetched data as props
export function HomeClient({ hello, session, latestPost }: {
    hello: { greeting: string | null } | null;
    session: SessionData | null;
    latestPost: React.ReactNode;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <main className={`flex min-h-screen flex-col items-center ${BG_PRIMARY} p-4 sm:p-12`}>
            
            {/* Header/User Display in Top Right Corner */}
            <div className="absolute top-8 right-8 z-10">
                <UserDisplay />
            </div>
            
            {/* Simple Centered Content Container */}
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-24 max-w-4xl">
                
                {/* Main Title Block */}
                <div className="text-center space-y-4">
                    <h1 className={`text-7xl font-light tracking-tight ${TEXT_DARK} sm:text-[6rem] border-b pb-4 ${BORDER_LIGHT}`}>
                        name name name
                    </h1>
                    <p className={`text-lg font-mono uppercase ${TEXT_SUBTLE}`}>
                        A professional application framework.
                    </p>
                </div>
                
                {/* Main Status / Call-to-Action Block */}
                <div className="flex flex-col items-center justify-center gap-6 p-8 bg-white rounded-xl shadow-xl border ${BORDER_LIGHT}">
                    
                    {/* tRPC Hello Message */}
                    <p className={`text-md ${TEXT_SUBTLE} italic`}>
                        <Code size={18} className="inline mr-1 text-gray-500" />
                        {hello ? hello.greeting : "Loading tRPC query..."}
                    </p>

                    {/* Session Status Message */}
                    <p className={`text-2xl font-bold text-center ${TEXT_DARK}`}>
                        {session ? `Welcome back, ${session.user?.name}!` : "Access required. Please sign in."}
                    </p>

                    {/* Action Links */}
                    <div className="flex flex-col items-start gap-4 mt-4">
                        
                        {/* Start Creating Link */}
                        {session && (
                            <Link
                                href="/create"
                                className={LINK_ACCENT_STYLE}
                            >
                                <ChevronRight size={18} />
                                Start Creating
                            </Link>
                        )}

                        {/* Publish Link */}
                        {session && (
                            <Link
                                href="/publish"
                                className={LINK_ACCENT_STYLE}
                            >
                                <ChevronRight size={18} />
                                Publish your work
                            </Link>
                        )}
                        
                    </div>

                    {/* Sign In/Out Button (Main Button) */}
                    <div className="mt-8">
                        {session ? (
                            <Link
                                href="/api/auth/signout"
                                className={BUTTON_PRIMARY_STYLE}
                            >
                                <LogOut size={20} className="inline mr-2" />
                                Sign Out
                            </Link>
                        ) : (
                            <button
                                onClick={() => setIsModalOpen(true)} // Open the modal
                                className={BUTTON_PRIMARY_STYLE}
                            >
                                <LogIn size={20} className="inline mr-2" />
                                Sign In
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Latest Post Section */}
                {session?.user && (
                    <div className="w-full mt-10">
                        <h2 className={`text-2xl font-semibold ${TEXT_DARK} mb-4 border-b pb-2 ${BORDER_LIGHT} flex items-center gap-2`}>
                            <Globe size={20} className={TEXT_SUBTLE} />
                            Latest Activity
                        </h2>
                        {latestPost}
                    </div>
                )}
            </div>

            {/* The Modal */}
            <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </main>
    );
}