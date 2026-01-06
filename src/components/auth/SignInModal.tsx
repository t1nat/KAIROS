"use client";

import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import Image from "next/image";

export function SignInModal({
  isOpen,
  onClose,
  initialEmail,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const router = useRouter();

  const signupMutation = api.auth.signup.useMutation();

  useEffect(() => {
    if (!isOpen) return;
    if (!initialEmail) return;
    setEmail(initialEmail);
  }, [isOpen, initialEmail]);

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

    try {
      await signupMutation.mutateAsync({
        email,
        password,
        name: name || undefined,
      });


      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign in failed. Please try signing in.");
      } else {
        setTimeout(() => {
          onClose();
          router.push("/");
          router.refresh();
        }, 500);
      }
    } catch (error) {
      console.error("Sign up error:", error);
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
    await signIn("google", { callbackUrl: "/" });
  };

  const resetForm = () => {
    setEmail(initialEmail ?? "");
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
        className="absolute inset-0 bg-black dark:bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-white dark:bg-gradient-to-br dark:from-bg-secondary dark:to-bg-primary rounded-3xl shadow-2xl w-full max-w-md border border-accent-primary/20 overflow-hidden">
        
        <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/10 to-transparent pointer-events-none" />
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary/60 rounded-xl transition-all duration-200 z-10"
        >
          <X size={20} />
        </button>

        <div className="relative p-8 pb-6 text-center border-b border-border-light/20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image
              src="/logo_purple.png"
              alt="Kairos Logo"
              width={64}
              height={64}
              className="w-16 h-16 object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo_white.png"
              alt="Kairos Logo"
              width={64}
              height={64}
              className="hidden w-16 h-16 object-contain dark:block"
              priority
            />
          </div>
          <h2 className="text-2xl font-bold text-fg-primary mb-2 font-display tracking-tight">
            {isSignUp ? "Create Account" : "Welcome to Kairos"}
          </h2>
          <p className="text-fg-secondary">
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
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-bg-surface border border-border-light/20 rounded-2xl font-semibold text-fg-primary hover:bg-bg-elevated hover:border-border-medium/50 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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

          <div className="flex flex-col items-center gap-3 py-2">
            <span className="text-sm text-fg-tertiary">
              or {isSignUp ? "sign up" : "sign in"} with email
            </span>
            <div className="w-full border-t border-border-light/20"></div>
          </div>

          <form onSubmit={isSignUp ? handleSignUp : handleEmailSignIn} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            {loadingMessage && (
              <div className="p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-xl text-accent-primary text-sm text-center flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                {loadingMessage}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-fg-secondary">
                  Name (Optional)
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-tertiary" size={18} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3 bg-bg-surface border border-border-light/20 rounded-xl text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary/60 focus:bg-bg-elevated transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-fg-secondary">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-tertiary" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-bg-surface border border-border-light/20 rounded-xl text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary/60 focus:bg-bg-elevated transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-fg-secondary">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-tertiary" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={isSignUp ? 8 : undefined}
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 bg-bg-surface border border-border-light/20 rounded-xl text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary/60 focus:bg-bg-elevated transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {isSignUp && (
                <p className="text-sm text-fg-tertiary">Password must be at least 8 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-6 py-4 bg-accent-primary rounded-2xl font-semibold text-white hover:bg-accent-hover transition-all duration-300 shadow-lg shadow-accent-primary/20 hover:shadow-xl hover:shadow-accent-primary/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
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
              className="text-base text-fg-secondary hover:text-accent-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>

          <p className="text-sm text-center text-fg-tertiary leading-relaxed pt-2">
            By continuing, you agree to Kairos&#39;s Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}