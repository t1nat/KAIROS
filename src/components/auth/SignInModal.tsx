"use client";

import { signIn } from "next-auth/react";
import { X, Mail, Lock, User, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
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
    setShowPassword(false);
    setAgreeTerms(false);
  };

  const toggleMode = () => {
    resetForm();
    setIsSignUp(!isSignUp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0a0a0f] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/[0.08] kairos-modal-content">
        {/* Subtle gradient border effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-accent-primary/10 via-transparent to-transparent pointer-events-none" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative px-8 pt-8 pb-6 text-center">
          {/* Logo */}
          <div className="w-14 h-14 rounded-2xl bg-accent-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-accent-primary/25">
            <Image
              src="/logo_white.png"
              alt="Kairos Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              priority
            />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 font-display tracking-tight">
            {isSignUp ? "Create your account" : "Welcome Back"}
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            {isSignUp
              ? "Join the Kairos workspace today."
              : "Enter your details to access your workspace"
            }
          </p>
        </div>

        <div className="relative px-8 pb-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {loadingMessage && (
            <div className="p-3 bg-accent-primary/10 border border-accent-primary/20 rounded-xl text-accent-primary text-sm text-center flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              {loadingMessage}
            </div>
          )}

          <form onSubmit={isSignUp ? handleSignUp : handleEmailSignIn} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                    className="w-full pl-12 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-accent-primary/50 focus:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-accent-primary/50 focus:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-bold text-white/60 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={isSignUp ? 8 : undefined}
                  disabled={isLoading}
                  className="w-full pl-12 pr-12 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-accent-primary/50 focus:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In: Remember me + Forgot password */}
            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                      rememberMe ? 'border-accent-primary bg-accent-primary' : 'border-white/20 hover:border-white/40'
                    }`}
                  >
                    {rememberMe && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span className="text-white/50 group-hover:text-white/70 transition-colors">Remember me</span>
                </label>
                <button type="button" className="text-white/50 hover:text-white/70 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            {/* Sign Up: Terms checkbox */}
            {isSignUp && (
              <label className="flex items-start gap-2.5 cursor-pointer group text-sm">
                <div
                  onClick={() => setAgreeTerms(!agreeTerms)}
                  className={`mt-0.5 w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
                    agreeTerms ? 'border-accent-primary bg-accent-primary' : 'border-white/20 hover:border-white/40'
                  }`}
                >
                  {agreeTerms && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-white/50 leading-relaxed">
                  I agree to the <span className="text-accent-primary underline underline-offset-2 cursor-pointer hover:text-accent-primary/80">Terms of Service</span> and <span className="text-accent-primary underline underline-offset-2 cursor-pointer hover:text-accent-primary/80">Privacy Policy</span>.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={isLoading || (isSignUp && !agreeTerms)}
              className="w-full px-6 py-4 bg-accent-primary rounded-2xl font-semibold text-white hover:brightness-110 transition-all duration-300 shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/35 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {isSignUp ? "Creating Account..." : "Signing in..."}
                </>
              ) : isSignUp ? (
                "Create Account"
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* OR CONTINUE WITH divider - only on sign in */}
          {!isSignUp && (
            <>
              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-white/[0.08]" />
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em]">Or continue with</span>
                <div className="flex-1 border-t border-white/[0.08]" />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2.5 px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </button>
              </div>
            </>
          )}

          <div className="text-center pt-1">
            <button
              onClick={toggleMode}
              disabled={isLoading}
              className="text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSignUp ? (
                <>Already have an account? <span className="font-semibold text-white">Log In</span></>
              ) : (
                <>Don&#39;t have an account?  <span className="font-semibold text-accent-primary">Create account</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}