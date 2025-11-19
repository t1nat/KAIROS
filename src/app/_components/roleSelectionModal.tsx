// src/app/_components/roleSelectionModal.tsx

"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Users, Shield, User, ArrowRight, Building2, Key } from "lucide-react";

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        {step === "choose" && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="text-white" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to EventFlow!</h2>
              <p className="text-slate-600">How will you be using EventFlow?</p>
            </div>

            <div className="grid gap-4">
              {/* Personal Use */}
              <button
                onClick={() => setPersonalMode.mutate()}
                disabled={setPersonalMode.isPending}
                className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition">
                    <User className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Personal Use</h3>
                    <p className="text-slate-600">
                      Manage your own projects, tasks, and notes. Perfect for individual productivity.
                    </p>
                  </div>
                  <ArrowRight className="text-slate-400 group-hover:text-indigo-600 transition" size={24} />
                </div>
              </button>

              {/* Organization Admin */}
              <button
                onClick={() => setStep("admin-setup")}
                className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition">
                    <Shield className="text-purple-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Organization Admin</h3>
                    <p className="text-slate-600">
                      Create a new organization space, invite team members, and manage projects.
                    </p>
                  </div>
                  <ArrowRight className="text-slate-400 group-hover:text-indigo-600 transition" size={24} />
                </div>
              </button>

              {/* Organization Worker */}
              <button
                onClick={() => setStep("worker-join")}
                className="p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-300 text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition">
                    <Building2 className="text-green-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Join Organization</h3>
                    <p className="text-slate-600">
                      Join an existing organization using an access code from your admin.
                    </p>
                  </div>
                  <ArrowRight className="text-slate-400 group-hover:text-indigo-600 transition" size={24} />
                </div>
              </button>
            </div>
          </>
        )}

        {step === "admin-setup" && !generatedCode && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-slate-600 hover:text-slate-900 mb-6 flex items-center gap-2"
            >
              ← Back
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="text-purple-600" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Create Organization</h2>
              <p className="text-slate-600">Set up your team workspace</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                />
              </div>

              <button
                onClick={handleCreateOrganization}
                disabled={createOrganization.isPending}
                className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg disabled:bg-slate-300"
              >
                {createOrganization.isPending ? "Creating..." : "Create Organization"}
              </button>
            </div>
          </>
        )}

        {step === "admin-setup" && generatedCode && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Key className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Organization Created!</h2>
              <p className="text-slate-600">Share this code with your team members</p>
            </div>

            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-8 text-center mb-6">
              <p className="text-sm text-slate-600 mb-2">Access Code</p>
              <p className="text-4xl font-bold text-indigo-600 tracking-wider font-mono">
                {generatedCode}
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(generatedCode)}
                className="mt-4 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition text-sm font-medium"
              >
                Copy Code
              </button>
            </div>

            <p className="text-sm text-slate-600 text-center mb-6">
              Keep this code safe. Team members will need it to join your organization.
            </p>

            <button
              onClick={onComplete}
              className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg"
            >
              Continue to Dashboard
            </button>
          </>
        )}

        {step === "worker-join" && (
          <>
            <button
              onClick={() => setStep("choose")}
              className="text-slate-600 hover:text-slate-900 mb-6 flex items-center gap-2"
            >
              ← Back
            </button>
            
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Join Organization</h2>
              <p className="text-slate-600">Enter the access code from your admin</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-mono text-center text-2xl tracking-wider"
                  maxLength={14}
                />
              </div>

              <button
                onClick={handleJoinOrganization}
                disabled={joinOrganization.isPending}
                className="w-full px-6 py-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg disabled:bg-slate-300"
              >
                {joinOrganization.isPending ? "Joining..." : "Join Organization"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}