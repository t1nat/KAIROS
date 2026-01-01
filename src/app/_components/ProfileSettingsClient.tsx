"use client";

import { useState, useRef } from "react";
import { User, Loader2, Upload, Camera } from "lucide-react";
import { api } from "~/trpc/react";
import Image from "next/image";

interface ProfileSettingsClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    bio?: string | null;
    id?: string;
  };
}

export function ProfileSettingsClient({ user }: ProfileSettingsClientProps) {
  const utils = api.useUtils();
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [imagePreview, setImagePreview] = useState(user.image ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userProfile } = api.user.getProfile.useQuery();

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
    
    onError: (error, _newData, context) => {
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

 
  const uploadImageMutation = api.user.uploadProfileImage?.useMutation({
    onSuccess: (data: { imageUrl: string }) => {
      setImagePreview(data.imageUrl);
      setIsUploading(false);
      alert("✅ Profile picture updated successfully!");
    },
    onError: (error) => {
      setIsUploading(false);
      alert("❌ Failed to upload image: " + error.message);
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("❌ File size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("❌ Please upload an image file");
      return;
    }

    if (!uploadImageMutation) {
      alert("❌ Upload feature not available");
      return;
    }

    setIsUploading(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Convert to base64 and upload
    const base64 = await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(file);
    });

    uploadImageMutation.mutate({ 
      image: base64,
      filename: file.name 
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ 
      name: name || undefined, 
      bio: bio || undefined 
    });
  };

  const getJoinedDate = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const createdAt = (userProfile as any)?.createdAt as string | Date | undefined;
    
    if (!createdAt) return null;
    
    return new Date(createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const joinedDate = getJoinedDate();

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
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-4">
            Profile Picture
          </label>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile"
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#A343EC]/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#A343EC]/20 flex items-center justify-center border-2 border-[#A343EC]/30">
                  <User className="text-[#A343EC]" size={40} />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="text-white" size={24} />
              </button>
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-6 py-2 bg-[#A343EC] text-white font-semibold rounded-lg hover:bg-[#8B35C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                {isUploading ? "Uploading..." : "Upload New Picture"}
              </button>
              <p className="text-xs text-[#E4DEEA] mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
        </div>

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
            maxLength={1000}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#FBF9F5] placeholder:text-[#59677C] focus:border-[#A343EC] focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all resize-none"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-[#E4DEEA]/70 mt-1">
            {bio.length}/1000 characters
          </p>
        </div>

        {joinedDate && (
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h3 className="font-semibold text-[#FBF9F5] mb-2">Member Since</h3>
            <p className="text-sm text-[#E4DEEA]">
              {joinedDate}
            </p>
          </div>
        )}

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