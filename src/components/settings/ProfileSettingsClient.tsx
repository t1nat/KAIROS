"use client";

import { useEffect, useState } from "react";
import { User, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { useUploadThing } from "~/lib/uploadthing";
import { useToast } from "~/components/providers/ToastProvider";
import { useSession } from "next-auth/react";
import { ImageUpload } from "~/components/ui/ImageUpload";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

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
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings");
  const utils = api.useUtils();
  const toast = useToast();
  const { update: updateSession, status } = useSession();
  const enabled = status === "authenticated";
  const [name, setName] = useState(user.name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [imagePreview, setImagePreview] = useState(user.image ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  

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

  const handleImageUpload = async (file: File) => {
    if (!uploadImageMutation) {
      toast.error("Upload feature not available");
      return;
    }

    setIsUploading(true);

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
    <div className="w-full">
      {/* Profile Picture Row */}
      <div className="px-12 py-8 border-b border-border-light/[0.01]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label className="text-lg font-medium text-fg-primary block mb-2">Profile Picture</label>
            <p className="text-base text-fg-tertiary">JPG, PNG or GIF. Max size 4MB.</p>
          </div>
          <div className="ml-12">
            <ImageUpload
              imagePreview={imagePreview}
              onImageChange={handleImageUpload}
              onImagePreviewChange={setImagePreview}
              isUploading={isUploading}
              label=""
              description=""
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full">
        {/* Full Name Row */}
        <div className="px-12 py-8 border-b border-border-light/[0.01]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-lg font-medium text-fg-primary block mb-2">
                Full Name
              </label>
            </div>
            <div className="ml-12 w-96">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-6 py-4 bg-transparent border-b border-border-light/[0.05] text-lg text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-border-light/[0.1] transition-all"
                placeholder="Enter your full name"
              />
            </div>
          </div>
        </div>

        {/* Email Address Row */}
        <div className="px-12 py-8 border-b border-border-light/[0.01]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="text-lg font-medium text-fg-primary block mb-2">
                {t("profile.email")}
              </label>
              <p className="text-base text-fg-tertiary">{t("profile.emailNote")}</p>
            </div>
            <div className="ml-12 w-96">
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className="w-full px-6 py-4 bg-transparent border-b border-border-light/[0.03] text-lg text-fg-tertiary cursor-not-allowed focus:outline-none"
                placeholder={t("profile.emailPlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* Bio Row */}
        <div className="px-12 py-8 border-b border-border-light/[0.01]">
          <div className="flex items-start justify-between">
            <div className="flex-1 pt-4">
              <label className="text-lg font-medium text-fg-primary block mb-2">
                {t("profile.bio")}
              </label>
              <p className="text-base text-fg-tertiary">
                {bio.length}/100 {t("profile.characters")}
              </p>
            </div>
            <div className="ml-12 w-96">
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 100))}
                maxLength={100}
                className="w-full px-6 py-4 bg-transparent border-b border-border-light/[0.05] text-lg text-fg-primary placeholder:text-fg-tertiary focus:outline-none focus:border-border-light/[0.1] transition-all resize-none"
                placeholder={t("profile.bioPlaceholder")}
              />
            </div>
          </div>
        </div>

        {/* Member Since Row */}
        {joinedDate && (
          <div className="px-12 py-8 border-b border-border-light/[0.01]">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-lg font-medium text-fg-primary block mb-2">{t("profile.memberSince")}</label>
              </div>
              <div className="ml-12 w-96">
                <p className="text-lg text-fg-secondary px-6 py-4">
                  {joinedDate}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button Row */}
        <div className="px-12 py-8">
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-4 bg-accent-primary hover:bg-accent-primary/90 text-white font-medium text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t("profile.saving")}
                </>
              ) : (
                t("profile.updateProfile")
              )}
            </button>
          </div>
          
          {!isSaving && updateProfile.isSuccess && (
            <div className="flex justify-end mt-4">
              <p className="text-base text-success flex items-center gap-2">
                ✓ {t("profile.saveSuccess")}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}