// src/app/_components/userDisplay.tsx

"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { LogOut } from "lucide-react"; // Importing LogOut icon for a clean look

// --- Monochromatic/Elegant Style Constants ---
const TEXT_DARK = "text-gray-900";
const TEXT_SUBTLE = "text-gray-600";
const ICON_SUBTLE = "text-gray-500";
const HOVER_DARK = "hover:text-gray-900";

export function UserDisplay() {
    // useSession hook gets the current session data
    const { data: sessionData, status } = useSession();

    // Show a loading state if the session hasn't loaded yet
    if (status === "loading") {
        return <div className={`text-sm ${TEXT_SUBTLE}`}>Loading user data...</div>;
    }
    
    // If the user is signed in (sessionData exists)
    if (sessionData?.user) {
        const { user } = sessionData;
        
        // Use the first letter of the name if no image exists
        const initials = user.name ? user.name.charAt(0).toUpperCase() : '?';
        
        return (
            // Flex container to hold the profile and sign-out action elegantly
            <div className="flex items-center space-x-4 p-2 bg-white rounded-full shadow-md border border-gray-100 transition duration-200">
                
                {/* User Info (Image and Name) */}
                <div className="flex items-center space-x-2">
                    
                    {/* 1. Display User Photo/Image (or Initials Fallback) */}
                    {user.image ? (
                        <Image
                            src={user.image}
                            alt={user.name ?? "User Photo"}
                            width={32}
                            height={32}
                            className="rounded-full object-cover border border-gray-300"
                        />
                    ) : (
                        <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold ${TEXT_DARK}`}>
                            {initials}
                        </div>
                    )}

                    {/* 2. Display User Name (Classy and prominent) */}
                    <span className={`text-lg font-semibold ${TEXT_DARK}`}>
                        {user.name}
                    </span>
                </div>
                
                {/* 3. Sign Out Action (Clean icon + text link) */}
                <button 
                    onClick={() => void signOut()} // Use void to ignore the promise return
                    title="Sign Out"
                    // Subtler sign-out styling: smaller text, subtle color, nice hover effect
                    className={`flex items-center gap-1 text-sm ${ICON_SUBTLE} ${HOVER_DARK} font-medium transition duration-200 p-1`}
                >
                    <LogOut size={16} className="mt-[-1px]" />
                    <span>Sign Out</span>
                </button>
        
            </div>
        );
    }

    // If the user is not signed in, show a subtle placeholder
    return (
        <div className={`text-sm ${TEXT_SUBTLE} italic`}>
            Session inactive
        </div>
    );
}