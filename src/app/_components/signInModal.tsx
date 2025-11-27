// src/app/_components/signInModal.tsx - FIXED TYPE ERRORS
"use client";

import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";

export function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const router = useRouter();

  const signupMutation = api.auth.signup.useMutation();

  if (!isOpen) return null;

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setLoadingMessage("Verifying credentials...");
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        setLoadingMessage("Success! Redirecting...");
        onClose();
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An error occurred during sign in");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setLoadingMessage("Creating your account...");

    try {
      await signupMutation.mutateAsync({
        email,
        password,
        name: name || undefined,
      });

      setLoadingMessage("Signing you in...");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign in failed. Please try signing in.");
      } else {
        setLoadingMessage("Success! Redirecting...");
        setTimeout(() => {
          onClose();
          router.push("/");
          router.refresh();
        }, 500);
      }
    } catch (error) {
      console.error("Sign up error:", error);
      // Type-safe error handling
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("An error occurred during sign up");
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoadingMessage("Redirecting to Google...");
    await signIn("google", { callbackUrl: "/" });
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setLoadingMessage("");
  };

  const toggleMode = () => {
    resetForm();
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-gradient-to-br from-[#1a2128] to-[#181F25] rounded-3xl shadow-2xl w-full max-w-md border border-[#A343EC]/20 overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-br from-[#A343EC]/5 to-transparent pointer-events-none" />
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-[#E4DEAA] hover:text-[#FBF9F5] hover:bg-white/10 rounded-xl transition-all duration-200 z-10"
        >
          <X size={20} />
        </button>

        <div className="relative p-8 pb-6 text-center border-b border-white/5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <img 
              src="/logo_white.png" 
              alt="Kairos Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-[#FBF9F5] mb-2">
            {isSignUp ? "Create Account" : "Welcome to Kairos"}
          </h2>
          <p className="text-[#E4DEAA]">
            {isSignUp 
              ? "Sign up to launch your projects." 
              : "Sign in to launch your projects."
            }
          </p>
        </div>

        <div className="relative p-8 space-y-6">
          
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl font-semibold text-[#FBF9F5] hover:bg-white/10 hover:border-white/20 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <div className="w-5 h-5 bg-white rounded flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <span>Continue with Google</span>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-sm text-[#E4DEAA] bg-gradient-to-br from-[#1a2128] to-[#181F25]">
                or {isSignUp ? "sign up" : "sign in"} with email
              </span>
            </div>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleEmailSignIn} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {loadingMessage && (
              <div className="p-3 bg-[#A343EC]/10 border border-[#A343EC]/20 rounded-xl text-[#A343EC] text-sm text-center flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                {loadingMessage}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-[#E4DEAA]">
                  Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E4DEAA]/50" size={18} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#FBF9F5] placeholder-[#E4DEAA]/40 focus:outline-none focus:border-[#A343EC]/50 focus:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-[#E4DEAA]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E4DEAA]/50" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#FBF9F5] placeholder-[#E4DEAA]/40 focus:outline-none focus:border-[#A343EC]/50 focus:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#E4DEAA]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#E4DEAA]/50" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={isSignUp ? 8 : undefined}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[#FBF9F5] placeholder-[#E4DEAA]/40 focus:outline-none focus:border-[#A343EC]/50 focus:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {isSignUp && (
                <p className="text-sm text-[#E4DEAA]/70">Password must be at least 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-[#A343EC] rounded-2xl font-semibold text-white hover:bg-[#8B35C7] transition-all duration-300 shadow-lg shadow-[#A343EC]/20 hover:shadow-xl hover:shadow-[#A343EC]/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {isSignUp ? "Creating Account..." : "Signing in..."}
                </>
              ) : (
                isSignUp ? "Sign Up" : "Sign In"
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={toggleMode}
              disabled={isLoading}
              className="text-base text-[#E4DEAA] hover:text-[#A343EC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>

          <p className="text-sm text-center text-[#E4DEAA]/70 leading-relaxed pt-2">
            By continuing, you agree to Kairos&#39;s Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}