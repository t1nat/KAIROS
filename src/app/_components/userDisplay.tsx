"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

import Image from "next/image";

export function UserDisplay() {
  // useSession hook gets the current session data
  const { data: sessionData, status } = useSession();

  // Show a loading state if the session hasn't loaded yet
  if (status === "loading") {
    return <div className="text-sm">Loading session...</div>;
  }
  
  // If the user is signed in (sessionData exists)
  if (sessionData?.user) {
    const { user } = sessionData;
    
    return (
      <div className="flex flex-col items-end space-y-1">
        <p className="text-sm font-semibold text-gray-500">
          Current session:
        </p>
        
        <div className="flex items-center space-x-3">
          {/* 1. Display User Photo/Image */}
          {user.image && (
            <Image
              src={user.image}
              alt={user.name ?? "User Photo"}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}

          {/* 2. Display User Name */}
          <span className="text-lg font-bold text-gray-800">
            {user.name}
          </span>
          
          {/* 3. Sign Out Button */}
        
          <button 
            onClick={() => signOut()} 
            className="text-red-500 hover:underline text-sm"
          >
            Sign Out
          </button>
    
        </div>
      </div>
    );
  }

  // If the user is not signed in
  return (
    <div className="text-sm text-gray-500">
      Current session: None
    </div>
  );
}