"use client";

import { useEffect, useRef, useState } from "react";
import { User, Loader2, Upload, Camera } from "lucide-react";
import { api } from "~/trpc/react";
import Image from "next/image";
import { useUploadThing } from "~/lib/uploadthing";
import { useToast } from "~/components/providers/ToastProvider";
import { useSession } from "next-auth/react";

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
  const toast = useToast();
  const { update: updateSession, status } = useSession();
  const enabled = status === "authenticated";
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [imagePreview, setImagePreview] = useState(user.image ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("imageUploader");

  const { data: userProfile } = api.user.getProfile.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: currentUser } = api.user.getCurrentUser.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (isUploading) return;
    if (!currentUser?.image) return;
    if (currentUser.image === imagePreview) return;
    setImagePreview(currentUser.image);
  }, [currentUser?.image, imagePreview, isUploading]);

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
      
      toast.error(error.message);
    },
    
    onSettled: () => {
      void utils.user.getCurrentUser.invalidate();
    },
  });

 
  const uploadImageMutation = api.user.uploadProfileImage?.useMutation({
    onSuccess: (data: { imageUrl: string }) => {
      setImagePreview(data.imageUrl);
      setIsUploading(false);

      utils.user.getCurrentUser.setData(undefined, (old) => {
        if (!old) return old;
        return { ...old, image: data.imageUrl };
      });
      utils.user.getProfile.setData(undefined, (old) => {
        if (!old) return old;
        return { ...old, image: data.imageUrl };
      });

      void utils.user.getCurrentUser.invalidate();
      void utils.user.getProfile.invalidate();

      // Refresh event feed/comment avatars that come from cached queries.
      void utils.event.getPublicEvents.invalidate();

      // Make sure NextAuth's session (used across the app) reflects the new image.
      // Without this, places like the event comment composer can keep showing the old avatar.
      void updateSession?.({ user: { image: data.imageUrl } });
      toast.success("Profile picture updated");
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error(error.message);
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // reset input so selecting the same file again triggers onChange
    e.target.value = "";

    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("File size must be 4MB or less");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (!uploadImageMutation) {
      toast.error("Upload feature not available");
      return;
    }

    setIsUploading(true);

    // Local preview only (do NOT store base64 in DB)
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const uploadResult = await startUpload([file]);
      const url = uploadResult?.[0]?.url;
      if (!url) throw new Error("Upload failed");
      uploadImageMutation.mutate({
        image: url,
        filename: file.name,
      });
    } catch (error) {
      setIsUploading(false);
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(message);
    }
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
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl ios-card-elevated p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <User className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">Profile Settings</h2>
          <p className="text-sm text-fg-secondary">Manage your public profile information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-fg-secondary mb-4">
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
                  className="w-24 h-24 rounded-full object-cover border-2 border-accent-primary/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-accent-primary/15 flex items-center justify-center border-2 border-accent-primary/30">
                  <User className="text-accent-primary" size={40} />
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
                className="flex items-center gap-2 px-6 py-2 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-fg-primary text-bg-primary hover:bg-fg-primary/90 dark:bg-bg-surface dark:text-fg-primary dark:hover:bg-bg-elevated shadow-sm"
              >
                <Upload size={18} />
                {isUploading ? "Uploading..." : "Upload New Picture"}
              </button>
              <p className="text-xs text-fg-secondary mt-2">
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
          <label className="block text-sm font-semibold text-fg-secondary mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-light/20 text-fg-primary placeholder:text-fg-tertiary focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-fg-secondary mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={user.email ?? ""}
            disabled
            className="w-full px-4 py-3 rounded-xl bg-bg-tertiary border border-border-light/20 text-fg-tertiary cursor-not-allowed"
            placeholder="your.email@example.com"
          />
          <p className="text-xs text-fg-tertiary mt-1">Email cannot be changed</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-fg-secondary mb-2">
            Bio
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 100))}
            maxLength={100}
            className="w-full px-4 py-3 rounded-xl bg-bg-surface border border-border-light/20 text-fg-primary placeholder:text-fg-tertiary focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all resize-none"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-fg-tertiary mt-1">
            {bio.length}/100 characters
          </p>
        </div>

        {joinedDate && (
          <div className="p-4 bg-bg-surface rounded-xl ios-card">
            <h3 className="font-semibold text-fg-primary mb-2">Member Since</h3>
            <p className="text-sm text-fg-secondary">
              {joinedDate}
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-border-light/20">
          <button
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-accent-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <p className="text-sm text-success mt-2 flex items-center gap-1">
              ✓ Changes saved successfully
            </p>
          )}
        </div>
      </form>
    </div>
  );
}