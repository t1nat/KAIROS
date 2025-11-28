"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const noteId = searchParams.get("noteId");
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const resetPassword = api.note.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => {
        router.push("/create?action=new_note");
      }, 3000);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!noteId || !token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    if (!newPassword || newPassword.length < 1) {
      setError("Password cannot be empty.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    resetPassword.mutate({
      noteId: parseInt(noteId),
      resetToken: token,
      newPassword: newPassword,
    });
  };

  if (!noteId || !token) {
    return (
      <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-[#DDE3E9] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#222B32] mb-2">Invalid Reset Link</h1>
          <p className="text-[#59677C] mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link
            href="/create?action=new_note"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-lg transition-all"
          >
            Go to Notes
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-[#DDE3E9] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#80C49B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-[#80C49B]" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#222B32] mb-2">Password Reset Successful!</h1>
          <p className="text-[#59677C] mb-6">
            Your note password has been updated. You can now access your note with the new password.
          </p>
          <p className="text-sm text-[#59677C]">
            Redirecting you to your notes...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-[#DDE3E9] p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#9448F2] to-[#80C49B] rounded-xl flex items-center justify-center">
            <Lock className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#222B32]">Reset Note Password</h1>
            <p className="text-sm text-[#59677C]">Create a new password for your encrypted note</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-semibold text-[#222B32] mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full p-3 pr-12 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] focus:border-transparent"
                disabled={resetPassword.isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59677C] hover:text-[#222B32]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-[#222B32] mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full p-3 pr-12 border border-[#DDE3E9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9448F2] focus:border-transparent"
                disabled={resetPassword.isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59677C] hover:text-[#222B32]"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="bg-[#9448F2]/5 border border-[#9448F2]/20 rounded-lg p-4">
            <p className="text-sm text-[#59677C]">
              💡 <strong className="text-[#222B32]">Tip:</strong> Choose a strong password that you will remember. 
              You will need this password to access your encrypted note.
            </p>
          </div>

          <button
            type="submit"
            disabled={resetPassword.isPending || !newPassword || !confirmPassword}
            className="w-full px-6 py-3 bg-gradient-to-r from-[#9448F2] to-[#80C49B] text-white font-semibold rounded-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Lock size={18} />
            {resetPassword.isPending ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#DDE3E9] text-center">
          <Link
            href="/create?action=new_note"
            className="text-sm text-[#9448F2] hover:text-[#80C49B] font-medium transition-colors"
          >
            ← Back to Notes
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FCFBF9] flex items-center justify-center">
        <div className="text-[#59677C]">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}