'use client';

import React, { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useUploadThing } from '~/lib/uploadthing';
import Image from 'next/image';
import { X, ImagePlus, Loader2, MapPin } from 'lucide-react';
import { useToast } from "~/components/providers/ToastProvider";
import { RegionMapPicker, type RegionOption } from "~/components/events/RegionMapPicker";

const REGIONS = [
  { value: 'sofia', label: 'Sofia' },
  { value: 'plovdiv', label: 'Plovdiv' },
  { value: 'varna', label: 'Varna' },
  { value: 'burgas', label: 'Burgas' },
  { value: 'ruse', label: 'Ruse' },
  { value: 'stara_zagora', label: 'Stara Zagora' },
  { value: 'pleven', label: 'Pleven' },
  { value: 'sliven', label: 'Sliven' },
  { value: 'dobrich', label: 'Dobrich' },
  { value: 'shumen', label: 'Shumen' },
] as const;

const REGION_MAP: RegionOption[] = [
  { value: "sofia", label: "Sofia", lat: 42.6977, lng: 23.3219 },
  { value: "plovdiv", label: "Plovdiv", lat: 42.1354, lng: 24.7453 },
  { value: "varna", label: "Varna", lat: 43.2141, lng: 27.9147 },
  { value: "burgas", label: "Burgas", lat: 42.5048, lng: 27.4626 },
  { value: "ruse", label: "Ruse", lat: 43.8356, lng: 25.9657 },
  { value: "stara_zagora", label: "Stara Zagora", lat: 42.4258, lng: 25.6345 },
  { value: "pleven", label: "Pleven", lat: 43.4170, lng: 24.6067 },
  { value: "sliven", label: "Sliven", lat: 42.6810, lng: 26.3220 },
  { value: "dobrich", label: "Dobrich", lat: 43.5726, lng: 27.8273 },
  { value: "shumen", label: "Shumen", lat: 43.2706, lng: 26.9229 },
];

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export const CreateEventForm: React.FC<CreateEventFormProps> = ({ onSuccess }) => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const toast = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [region, setRegion] = useState<string>('sofia');
  const [enableRsvp, setEnableRsvp] = useState(false);
  const [sendReminders, setSendReminders] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  // Automatically disable sendReminders when enableRsvp is turned off
  useEffect(() => {
    if (!enableRsvp && sendReminders) {
      setSendReminders(false);
    }
  }, [enableRsvp, sendReminders]);

  const createEvent = api.event.createEvent.useMutation({
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setEventDate('');
      setRegion('sofia');
      setEnableRsvp(false);
      setSendReminders(false);
      setImageFile(null);
      setImagePreview(null);
      void utils.event.getPublicEvents.invalidate();
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error creating event:', error);
      toast.error(error.message);
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      toast.error('You must be logged in to create an event');
      return;
    }

    if (!title.trim() || !description.trim() || !eventDate || !region) {
      toast.info('Please fill in all required fields');
      return;
    }

    try {
      setIsUploading(true);
      let imageUrl: string | undefined;

      if (imageFile) {
        const uploadResult = await startUpload([imageFile]);
        imageUrl = uploadResult?.[0]?.url;
      }

      createEvent.mutate({
        title: title.trim(),
        description: description.trim(),
        eventDate: new Date(eventDate),
        region: region as "sofia" | "plovdiv" | "varna" | "burgas" | "ruse" | "stara_zagora" | "pleven" | "sliven" | "dobrich" | "shumen",
        imageUrl,
        enableRsvp,
        sendReminders: enableRsvp ? sendReminders : false, // Only send reminders if RSVP is enabled
      });
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!session) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-fg-secondary">Sign in to create events</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Image upload — prominent, Instagram-style */}
      <div>
        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden">
            <Image
              src={imagePreview}
              alt="Preview"
              width={800}
              height={400}
              className="w-full aspect-video object-cover"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="bg-bg-secondary border border-dashed border-white/[0.1] rounded-xl p-8 text-center hover:border-accent-primary/40 transition-colors">
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={createEvent.isPending || isUploading}
            />
            <label htmlFor="image" className="cursor-pointer flex flex-col items-center gap-2">
              <ImagePlus className="text-fg-tertiary" size={28} />
              <span className="text-xs text-fg-tertiary">Add photo</span>
            </label>
          </div>
        )}
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title"
        maxLength={256}
        className="w-full px-0 py-2 bg-transparent border-b border-white/[0.08] focus:border-accent-primary text-base text-fg-primary placeholder:text-fg-tertiary focus:outline-none transition-colors"
        disabled={createEvent.isPending || isUploading}
        required
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Write a caption..."
        rows={3}
        className="w-full px-0 py-2 bg-transparent border-b border-white/[0.08] focus:border-accent-primary text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none transition-colors resize-none"
        disabled={createEvent.isPending || isUploading}
        required
      />

      {/* Date & Region — inline row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-3 py-2 bg-bg-secondary rounded-lg text-sm text-fg-primary focus:outline-none focus:ring-1 focus:ring-accent-primary [color-scheme:dark]"
            disabled={createEvent.isPending || isUploading}
            required
          />
        </div>
        <div>
          <label className="block text-xs text-fg-tertiary mb-1">
            <MapPin className="inline mr-0.5" size={11} />
            Region
          </label>
          <RegionMapPicker
            value={region}
            onChange={setRegion}
            regions={REGION_MAP}
            fallback={
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 bg-bg-secondary rounded-lg text-sm text-fg-primary focus:outline-none focus:ring-1 focus:ring-accent-primary appearance-none cursor-pointer [&>option]:text-fg-primary [&>option]:bg-bg-secondary"
                disabled={createEvent.isPending || isUploading}
                required
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            }
          />
        </div>
      </div>

      {/* Toggles — compact */}
      <div className="flex items-center gap-4 py-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enableRsvp}
            onChange={(e) => setEnableRsvp(e.target.checked)}
            className="w-4 h-4 rounded bg-bg-secondary text-accent-primary focus:ring-accent-primary/30 cursor-pointer"
          />
          <span className="text-xs text-fg-secondary">Enable RSVP</span>
        </label>
        {enableRsvp && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sendReminders}
              onChange={(e) => setSendReminders(e.target.checked)}
              className="w-4 h-4 rounded bg-bg-secondary text-accent-primary focus:ring-accent-primary/30 cursor-pointer"
            />
            <span className="text-xs text-fg-secondary">Send reminders</span>
          </label>
        )}
      </div>

      {/* Submit — full width like IG share */}
      <button
        type="submit"
        disabled={createEvent.isPending || isUploading || !title.trim() || !description.trim() || !eventDate || !region}
        className="w-full py-3 bg-accent-primary text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isUploading || createEvent.isPending ? (
          <>
            <Loader2 className="animate-spin" size={16} />
            {isUploading ? 'Uploading...' : 'Publishing...'}
          </>
        ) : (
          'Share'
        )}
      </button>
    </form>
  );
};