// src/app/_components/signInModal.tsx

"use client";

import { signIn } from "next-auth/react";
import { X, Chrome, MessageCircle } from "lucide-react";

export function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-8 pb-6 text-center border-b border-slate-200">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to EventFlow</h2>
          <p className="text-slate-600">Sign in to start managing your events and projects</p>
        </div>

        {/* Sign In Options */}
        <div className="p-8 space-y-3">
          
          {/* Google Sign-In Button */}
          <button
            onClick={() => signIn("google")}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 shadow-sm hover:shadow-md group"
          >
            <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
              <Chrome size={20} className="text-[#4285F4]" />
            </div>
            <span>Continue with Google</span>
          </button>

          {/* Discord Sign-In Button */}
          <button
            onClick={() => signIn("discord")}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#5865F2] rounded-xl font-semibold text-white hover:bg-[#4752C4] transition-all duration-300 shadow-sm hover:shadow-md group"
          >
            <MessageCircle size={20} />
            <span>Continue with Discord</span>
          </button>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-slate-500 bg-white">Secure authentication</span>
            </div>
          </div>

          {/* Info Text */}
          <p className="text-xs text-center text-slate-500 leading-relaxed">
            By continuing, you agree to EventFlow&#39;s Terms of Service and Privacy Policy. We&#39;ll never post without your permission.
          </p>
        </div>
      </div>
    </div>
  );
}