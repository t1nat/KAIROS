"use client";

import { useEffect, useState } from "react";
import { User, Loader2, Check } from "lucide-react";
import { api } from "~/trpc/react";
import { useUploadThing } from "~/lib/uploadthing";
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
    },
    onError: (error) => {
      setIsUploading(false);
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!uploadImageMutation) {
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
     <div className="w-full bg-gray-50/50 dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif] mb-2">
            Profile
          </h1>
          <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
            Manage your profile and preferences
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Profile Picture Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <User size={16} className="text-gray-500 dark:text-gray-400" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        Profile Picture
                      </div>
                      <div className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510]">
                        JPG, PNG or GIF. Max size 4MB.
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
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
            </div>
          </div>

          {/* Full Name Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" 
                          fill="currentColor" className="text-gray-500 dark:text-gray-400"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        Full Name
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-transparent text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510] focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email Address Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" 
                          fill="currentColor" className="text-gray-500 dark:text-gray-400"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        Email Address
                      </div>
                      <div className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510] opacity-60">
                        {user.email}
                      </div>
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mt-1">
                        {(() => {
                          try {
                            return t("profile.emailNote");
                          } catch {
                            return "Email cannot be changed";
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V4C20 2.9 19.1 2 18 2ZM9 4H11V9L10 8.25L9 9V4ZM18 20H6V4H7V13L10 10.75L13 13V4H18V20Z" 
                          fill="currentColor" className="text-gray-500 dark:text-gray-400"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        Bio
                      </div>
                      <textarea
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value.slice(0, 100))}
                        maxLength={100}
                        className="w-full bg-transparent text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510] focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
                        placeholder={(() => {
                          try {
                            return t("profile.bioPlaceholder");
                          } catch {
                            return "Tell us a little about yourself...";
                          }
                        })()}
                      />
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mt-2">
                        {bio.length}/100 {(() => {
                          try {
                            return t("profile.characters");
                          } catch {
                            return "characters";
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Member Since Card */}
          {joinedDate && (
            <div className="mb-3">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" 
                            fill="currentColor" className="text-gray-500 dark:text-gray-400"/>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                          {(() => {
                            try {
                              return t("profile.memberSince");
                            } catch {
                              return "Member Since";
                            }
                          })()}
                        </div>
                        <div className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510]">
                          {joinedDate}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`w-full py-3.5 rounded-lg text-center text-[16px] leading-[1.25] tracking-[-0.01em] font-[510] font-[system-ui,Kairos,sans-serif] transition-all flex items-center justify-center gap-3 ${
                    isSaving
                      ? "bg-gray-100/60 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-accent-primary text-white hover:bg-accent-hover active:opacity-90"
                  }`}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      {(() => {
                        try {
                          return t("profile.saving");
                        } catch {
                          return "Saving...";
                        }
                      })()}
                    </>
                  ) : (
                    (() => {
                      try {
                        return t("profile.updateProfile");
                      } catch {
                        return "Update Profile";
                      }
                    })()
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {!isSaving && updateProfile.isSuccess && (
            <div className="mb-3">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl overflow-hidden">
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-center gap-2">
                    <Check size={18} className="text-green-600 dark:text-green-400" strokeWidth={2.5} />
                    <span className="text-[15px] leading-[1.3] tracking-[-0.012em] text-green-600 dark:text-green-400 font-[system-ui,Kairos,sans-serif]">
                      {(() => {
                        try {
                          return t("profile.saveSuccess");
                        } catch {
                          return "Profile updated successfully";
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Spacing */}
          <div className="h-6"></div>
        </form>
      </div>
    </div>
  );
}
