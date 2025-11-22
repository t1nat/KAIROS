// src/app/_components/profileSettingsClient.tsx
"use client";

import { useState } from "react";
import { User, Loader2 } from "lucide-react";
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
    onMutate: async (newData) => {
      setIsSaving(true);
      await utils.user.getCurrentUser.cancel();
      const previousUser = utils.user.getCurrentUser.getData();
      
      utils.user.getCurrentUser.setData(undefined, (old) => {
        if (!old) return old;
        return {
          ...old,
          name: newData.name ?? old.name,
          bio: newData.bio ?? old.bio,
        };
      });
      
      return { previousUser };
    },
    
    onSuccess: () => {
      setIsSaving(false);
    },
    
    onError: (error, newData, context) => {
      setIsSaving(false);
      
      if (context?.previousUser) {
        utils.user.getCurrentUser.setData(undefined, context.previousUser);
      }
      
      alert(`❌ Error: ${error.message}`);
    },
    
    onSettled: () => {
      void utils.user.getCurrentUser.invalidate();
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
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
          <User className="text-[#A343EC]" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#FBF9F5]">Profile Settings</h2>
          <p className="text-sm text-[#E4DEEA]">Manage your public profile information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#FBF9F5] placeholder:text-[#59677C] focus:border-[#A343EC] focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#59677C] cursor-not-allowed"
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-[#59677C] mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Bio
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#FBF9F5] placeholder:text-[#59677C] focus:border-[#A343EC] focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all resize-none"
            placeholder="Tell us about yourself..."
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Profile Picture
          </label>
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
            {user.image ? (
              <img 
                src={user.image} 
                alt="Profile" 
                className="w-16 h-16 rounded-full object-cover ring-2 ring-white/10"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-[#A343EC] to-[#9448F2] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {name?.charAt(0).toUpperCase() ?? user.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm text-[#FBF9F5] font-medium mb-1">Profile picture from Google account</p>
              <p className="text-xs text-[#E4DEEA]">Managed through your Google account settings</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-[#A343EC]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
          {!isSaving && updateProfile.isSuccess && (
            <p className="text-sm text-[#80C49B] mt-2 flex items-center gap-1">
              ✓ Changes saved successfully
            </p>
          )}
        </div>
      </form>
    </div>
  );
}