"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ChevronRight } from "lucide-react";
import { useToast } from "~/components/providers/ToastProvider";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function RoleSelectionModal({ isOpen, onComplete }: RoleSelectionModalProps) {
  const toast = useToast();
  const [step, setStep] = useState<"choose" | "admin-setup" | "worker-join">("choose");
  const [organizationName, setOrganizationName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const createOrganization = api.organization.create.useMutation({
    onSuccess: (data) => {
      setGeneratedCode(data.accessCode);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const joinOrganization = api.organization.join.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setPersonalMode = api.user.setPersonalMode.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateOrganization = () => {
    if (!organizationName.trim()) {
      toast.info("Please enter an organization name");
      return;
    }
    createOrganization.mutate({ name: organizationName });
  };

  const handleJoinOrganization = () => {
    if (!accessCode.trim()) {
      toast.info("Please enter the access code");
      return;
    }
    joinOrganization.mutate({ code: accessCode });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast.success("Access code copied");
   } catch {
    const textArea = document.createElement("textarea");
    textArea.value = generatedCode;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    toast.success("Access code copied");
  }
  };

  const handleOrgNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateOrganization();
    }
  };

  const handleAccessCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleJoinOrganization();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full max-w-2xl mx-auto animate-slideUp -mt-26">
      <div className="p-8">
        {step === "choose" && (
          <>
            <h3 className="text-2xl font-semibold text-fg-primary mb-6 text-left">
              What will you be using Kairos for?
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setStep("admin-setup")}
                className="w-full p-4 bg-bg-surface border border-border-light/20 rounded-xl hover:bg-bg-elevated hover:border-accent-primary/40 transition-all duration-200 text-left group flex items-center justify-between"
              >
                <span className="text-fg-primary font-medium">Organization Admin</span>
                <ChevronRight className="text-fg-tertiary group-hover:text-accent-primary transition-colors" size={20} />
              </button>

              <button
                onClick={() => setStep("worker-join")}
                className="w-full p-4 bg-bg-surface border border-border-light/20 rounded-xl hover:bg-bg-elevated hover:border-accent-primary/40 transition-all duration-200 text-left group flex items-center justify-between"
              >
                <span className="text-fg-primary font-medium">Join Organization</span>
                <ChevronRight className="text-fg-tertiary group-hover:text-accent-primary transition-colors" size={20} />
              </button>

              <button
                onClick={() => setPersonalMode.mutate()}
                disabled={setPersonalMode.isPending}
                className="w-full p-4 bg-bg-surface shadow-sm rounded-xl hover:bg-bg-elevated hover:shadow-md transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-fg-primary font-medium">Personal Use</span>
                <ChevronRight className="text-fg-tertiary group-hover:text-accent-primary transition-colors" size={20} />
              </button>
            </div>
          </>
        )}

        {step === "admin-setup" && !generatedCode && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-fg-tertiary hover:text-fg-primary mb-6 flex items-center gap-2 transition text-sm"
            >
              ← Back
            </button>
            
            <h3 className="text-xl font-semibold text-fg-primary mb-6">Create Organization</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-fg-secondary mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  onKeyDown={handleOrgNameKeyDown}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 bg-bg-surface border border-border-light/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/60 text-fg-primary placeholder:text-fg-tertiary"
                  autoFocus
                />
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={createOrganization.isPending}
                className="w-full px-6 py-3 bg-accent-primary text-white font-medium rounded-lg hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createOrganization.isPending ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </>
        )}

        {step === "admin-setup" && generatedCode && (
          <>
            <h3 className="text-xl font-semibold text-fg-primary mb-2 text-center">Organization Created!</h3>
            <p className="text-sm text-fg-secondary mb-6 text-center">Share this code with your team</p>

            <div className="bg-bg-surface border border-accent-primary/30 rounded-xl p-6 text-center mb-6">
              <p className="text-xs text-fg-tertiary mb-2">Access Code</p>
              <p className="text-3xl font-bold text-accent-primary tracking-wider font-mono mb-4">
                {generatedCode}
              </p>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 bg-accent-primary/15 border border-accent-primary/30 text-accent-primary rounded-lg hover:bg-accent-primary/25 transition text-sm font-medium"
              >
                Copy Code
              </button>
            </div>

            <button
              onClick={onComplete}
              className="w-full px-6 py-3 bg-accent-primary text-white font-medium rounded-lg hover:bg-accent-hover transition-all duration-200"
            >
              Continue to Dashboard
            </button>
          </>
        )}

        {step === "worker-join" && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-fg-tertiary hover:text-fg-primary mb-6 flex items-center gap-2 transition text-sm"
            >
              ← Back
            </button>
            
            <h3 className="text-xl font-semibold text-fg-primary mb-6">Join Organization</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-fg-secondary mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  onKeyDown={handleAccessCodeKeyDown}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 bg-bg-surface border border-border-light/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary/60 text-fg-primary font-mono text-center text-xl tracking-wider placeholder:text-fg-tertiary"
                  maxLength={14}
                  autoFocus
                />
              </div>

              <button
                onClick={handleJoinOrganization}
                disabled={joinOrganization.isPending}
                className="w-full px-6 py-3 bg-accent-primary text-white font-medium rounded-lg hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joinOrganization.isPending ? "Joining..." : "Join Organization"}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}