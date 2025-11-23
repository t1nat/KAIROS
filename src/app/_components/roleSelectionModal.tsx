"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { ChevronRight } from "lucide-react";

interface RoleSelectionModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function RoleSelectionModal({ isOpen, onComplete }: RoleSelectionModalProps) {
  const [step, setStep] = useState<"choose" | "admin-setup" | "worker-join">("choose");
  const [organizationName, setOrganizationName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const createOrganization = api.organization.create.useMutation({
    onSuccess: (data) => {
      setGeneratedCode(data.accessCode);
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const joinOrganization = api.organization.join.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const setPersonalMode = api.user.setPersonalMode.useMutation({
    onSuccess: () => {
      onComplete();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleCreateOrganization = () => {
    if (!organizationName.trim()) {
      alert("Please enter an organization name");
      return;
    }
    createOrganization.mutate({ name: organizationName });
  };

  const handleJoinOrganization = () => {
    if (!accessCode.trim()) {
      alert("Please enter the access code");
      return;
    }
    joinOrganization.mutate({ code: accessCode });
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      alert("Code copied to clipboard!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = generatedCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Code copied to clipboard!");
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
    <div className="w-full max-w-2xl mx-auto animate-slideUp">
      <div className="bg-[#1a2128] backdrop-blur-sm rounded-2xl border border-white/20 p-8 shadow-xl">
        {step === "choose" && (
          <>
            <h3 className="text-2xl font-semibold text-[#FBF9F5] mb-6 text-center">
              What will you be using Kairos for?
            </h3>

            <div className="space-y-3">
              {/* Personal Use */}
              <button
                onClick={() => setPersonalMode.mutate()}
                disabled={setPersonalMode.isPending}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#A343EC]/50 transition-all duration-200 text-left group disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span className="text-[#FBF9F5] font-medium">Personal Use</span>
                <ChevronRight className="text-[#E4DEAA] group-hover:text-[#A343EC] transition-colors" size={20} />
              </button>

              {/* Organization Admin */}
              <button
                onClick={() => setStep("admin-setup")}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#A343EC]/50 transition-all duration-200 text-left group flex items-center justify-between"
              >
                <span className="text-[#FBF9F5] font-medium">Organization Admin</span>
                <ChevronRight className="text-[#E4DEAA] group-hover:text-[#A343EC] transition-colors" size={20} />
              </button>

              {/* Join Organization */}
              <button
                onClick={() => setStep("worker-join")}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-[#A343EC]/50 transition-all duration-200 text-left group flex items-center justify-between"
              >
                <span className="text-[#FBF9F5] font-medium">Join Organization</span>
                <ChevronRight className="text-[#E4DEAA] group-hover:text-[#A343EC] transition-colors" size={20} />
              </button>
            </div>
          </>
        )}

        {step === "admin-setup" && !generatedCode && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-[#E4DEAA] hover:text-[#FBF9F5] mb-6 flex items-center gap-2 transition text-sm"
            >
              ← Back
            </button>
            
            <h3 className="text-xl font-semibold text-[#FBF9F5] mb-6">Create Organization</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#E4DEAA] mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  onKeyDown={handleOrgNameKeyDown}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] placeholder:text-[#E4DEAA]/50"
                  autoFocus
                />
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={createOrganization.isPending}
                className="w-full px-6 py-3 bg-[#A343EC] text-white font-medium rounded-lg hover:bg-[#8B35C7] transition-all duration-200 disabled:bg-white/10 disabled:cursor-not-allowed"
              >
                {createOrganization.isPending ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </>
        )}

        {step === "admin-setup" && generatedCode && (
          <>
            <h3 className="text-xl font-semibold text-[#FBF9F5] mb-2 text-center">Organization Created!</h3>
            <p className="text-sm text-[#E4DEAA] mb-6 text-center">Share this code with your team</p>

            <div className="bg-white/5 border border-[#A343EC]/30 rounded-xl p-6 text-center mb-6">
              <p className="text-xs text-[#E4DEAA] mb-2">Access Code</p>
              <p className="text-3xl font-bold text-[#A343EC] tracking-wider font-mono mb-4">
                {generatedCode}
              </p>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2 bg-[#A343EC]/20 border border-[#A343EC]/30 text-[#A343EC] rounded-lg hover:bg-[#A343EC]/30 transition text-sm font-medium"
              >
                Copy Code
              </button>
            </div>

            <button
              onClick={onComplete}
              className="w-full px-6 py-3 bg-[#A343EC] text-white font-medium rounded-lg hover:bg-[#8B35C7] transition-all duration-200"
            >
              Continue to Dashboard
            </button>
          </>
        )}

        {step === "worker-join" && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-[#E4DEAA] hover:text-[#FBF9F5] mb-6 flex items-center gap-2 transition text-sm"
            >
              ← Back
            </button>
            
            <h3 className="text-xl font-semibold text-[#FBF9F5] mb-6">Join Organization</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#E4DEAA] mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  onKeyDown={handleAccessCodeKeyDown}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent text-[#FBF9F5] font-mono text-center text-xl tracking-wider placeholder:text-[#E4DEAA]/50"
                  maxLength={14}
                  autoFocus
                />
              </div>

              <button
                onClick={handleJoinOrganization}
                disabled={joinOrganization.isPending}
                className="w-full px-6 py-3 bg-[#A343EC] text-white font-medium rounded-lg hover:bg-[#8B35C7] transition-all duration-200 disabled:bg-white/10 disabled:cursor-not-allowed"
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