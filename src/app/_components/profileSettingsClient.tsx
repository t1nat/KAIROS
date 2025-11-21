// src/app/_components/profileSettingsClient.tsx
"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { api } from "~/trpc/react";

interface ProfileSettingsClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    bio?: string | null;
  };
}

export function ProfileSettingsClient({ user }: ProfileSettingsClientProps) {
  const utils = api.useUtils();
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const updateProfile = api.settings.updateProfile.useMutation({
    // OPTIMISTIC UPDATE: Update UI immediately before mutation completes
    onMutate: async (newData) => {
      setIsSaving(true);
      
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await utils.user.getCurrentUser.cancel();
      
      // Snapshot the previous value
      const previousUser = utils.user.getCurrentUser.getData();
      
      // Optimistically update the cache with new values
      utils.user.getCurrentUser.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          name: newData.name ?? old.name,
          bio: newData.bio ?? old.bio,
        };
      });
      
      // Return context with the previous value
      return { previousUser };
    },
    
    // If mutation succeeds, just update the saving state
    onSuccess: () => {
      setIsSaving(false);
      // No need to refetch - optimistic update already happened!
    },
    
    // If mutation fails, roll back to previous value
    onError: (error, newData, context) => {
      setIsSaving(false);
      
      // Restore previous data
      if (context?.previousUser) {
        utils.user.getCurrentUser.setData(undefined, context.previousUser);
      }
      
      alert(`❌ Error: ${error.message}`);
    },
    
    // Always refetch after error or success to ensure we're in sync
    onSettled: () => {
      utils.user.getCurrentUser.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ 
      name: name || undefined, 
      bio: bio || undefined 
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <User className="text-indigo-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Profile Settings</h2>
          <p className="text-sm text-slate-600">Manage your public profile information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Bio
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Profile Picture
          </label>
          <div className="flex items-center gap-4">
            {user.image ? (
              <img 
                src={user.image} 
                alt="Profile" 
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {name?.charAt(0).toUpperCase() ?? user.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
            )}
            <div>
              <p className="text-sm text-slate-600 mb-2">Profile picture from Google account</p>
              <p className="text-xs text-slate-500">Managed through your Google account settings</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          {!isSaving && updateProfile.isSuccess && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              ✓ Changes saved successfully
            </p>
          )}
        </div>
      </form>
    </div>
  );
}