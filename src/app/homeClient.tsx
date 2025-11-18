// src/app/HomeClient.tsx

"use client";

import Link from "next/link";
import { useState } from "react";
import { LatestPost } from "~/app/_components/post";
import { UserDisplay } from "./_components/userDisplay";
import { SignInModal } from "./_components/signInModal"; // Import the modal

// Define a type for the session data passed from the server
interface SessionData {
    user?: { name?: string | null } | null;
}

// This component receives server-fetched data as props
export function HomeClient({ hello, session, latestPost }: {
    hello: { greeting: string | null } | null;
    session: SessionData | null;
    latestPost: React.ReactNode;
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-[#FFFEE8]">
            
            {/* User Display in Top Right Corner */}
            <div className="absolute top-8 right-8 z-10">
                <UserDisplay />
            </div>
            
            {/* Simple Centered Content Container */}
            <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
                
                {/* Main Title */}
                <h1 className="text-6xl font-extrabold tracking-tight text-[#140C00] sm:text-[7rem]">
                    name name name 
                </h1>
                
                {/* Main Status / Call-to-Action Block */}
                <div className="flex flex-col items-center justify-center gap-6">
                    
                    {/* tRPC Hello Message */}
                    <p className="text-xl text-[#140C00]">
                        {hello ? hello.greeting : "Loading tRPC query..."}
                    </p>

                    {/* Session Status Message */}
                    <p className="text-center text-3xl text-[#140C00]">
                        {session ? `Welcome, ${session.user?.name}!` : "Please sign in."}
                    </p>

                 {/* 👈 ADD NEW LINK HERE */}
                {session && (
                    <Link
                        href="/create" // Change this to your desired page URL
                        className="text-xl text-blue-600 hover:text-blue-800 font-semibold underline transition-colors"
                    >
                        Start Creating
                    </Link>
                )}
                {/* 👆 NEW LINK ADDED */}
                    
                    {/* Sign In/Out Button (now a button for modal/link for signout) */}
                    {session ? (
                        <Link
                            href="/api/auth/signout"
                            className="rounded-full bg-white/20 px-12 py-4 text-xl text-[#140C00] font-semibold no-underline transition hover:bg-white/30"
                        >
                            Sign out
                        </Link>
                    ) : (
                        <button
                            onClick={() => setIsModalOpen(true)} // Open the modal
                            className="rounded-full bg-white/20 px-12 py-4 text-xl text-[#140C00] font-semibold transition hover:bg-white/30"
                        >
                            Sign in
                        </button>
                    )}
                </div>
                
                {session?.user && latestPost}
            </div>

            {/* The Modal */}
            <SignInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </main>
    );
}