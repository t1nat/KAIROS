// src/app/_components/SignInModal.tsx

"use client";

import { signIn } from "next-auth/react";
import { X, Globe } from "lucide-react"; // Import X icon for closing

export function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  // The modal overlay and positioning
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm relative text-gray-900">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

        <div className="space-y-4">
          
          {/* Google Sign-In Button */}
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#4285F4] text-white py-3 font-semibold transition hover:bg-[#357AE8]"
          >
            <Globe size={20} /> Sign in with Google
          </button>

          {/* Discord Sign-In Button */}
          <button
            onClick={() => signIn("discord")}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] text-white py-3 font-semibold transition hover:bg-[#4E5BDE]"
          >
            <Globe size={20} /> Sign in with Discord
          </button>
          
        </div>
      </div>
    </div>
  );
}