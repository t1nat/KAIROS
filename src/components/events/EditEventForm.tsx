'use client';

import React, { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useUploadThing } from '~/lib/uploadthing';
import Image from 'next/image';
import { X, ImagePlus, Loader2, MapPin, Calendar, Clock, ChevronDown } from 'lucide-react';
import { useToast } from "~/components/providers/ToastProvider";

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

interface EventData {
  id: number;
  title: string;
  description: string;
  eventDate: Date;
  region: string;
  imageUrl: string | null;
  enableRsvp: boolean;
}

interface EditEventFormProps {
  event: EventData;
  onSuccess?: () => void;
  onClose?: () => void;
}

export const EditEventForm: React.FC<EditEventFormProps> = ({ event, onSuccess, onClose }) => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const toast = useToast();

  // Parse event date into date and time strings
  const eventDateTime = new Date(event.eventDate);
  const initialDate = eventDateTime.toISOString().split('T')[0] ?? '';
  const initialTime = eventDateTime.toTimeString().slice(0, 5);

  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [eventDate, setEventDate] = useState(initialDate);
  const [eventTime, setEventTime] = useState(initialTime);
  const [region, setRegion] = useState<string>(event.region);
  const [enableRsvp, setEnableRsvp] = useState(event.enableRsvp);
  const [sendReminders, setSendReminders] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event.imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

  useEffect(() => {
    if (!enableRsvp && sendReminders) {
      setSendReminders(false);
    }
  }, [enableRsvp, sendReminders]);

  const updateEvent = api.event.updateEvent.useMutation({
    onSuccess: () => {
      void utils.event.getPublicEvents.invalidate();
      toast.success('Event updated successfully');
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Error updating event:', error);
      toast.error(error.message);
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setRemoveCurrentImage(false);
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
    setRemoveCurrentImage(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      toast.error('You must be logged in to update an event');
      return;
    }

    const combinedDateTime = eventDate && eventTime ? `${eventDate}T${eventTime}` : eventDate;

    if (!title.trim() || !description.trim() || !combinedDateTime || !region) {
      toast.info('Please fill in all required fields');
      return;
    }

    try {
      setIsUploading(true);
      let imageUrl: string | undefined | null = undefined;

      if (imageFile) {
        const uploadResult = await startUpload([imageFile]);
        imageUrl = uploadResult?.[0]?.url;
      } else if (removeCurrentImage) {
        imageUrl = null;
      }

      updateEvent.mutate({
        eventId: event.id,
        title: title.trim(),
        description: description.trim(),
        eventDate: new Date(combinedDateTime),
        region: region as "sofia" | "plovdiv" | "varna" | "burgas" | "ruse" | "stara_zagora" | "pleven" | "sliven" | "dobrich" | "shumen",
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        enableRsvp,
        sendReminders: enableRsvp ? sendReminders : false,
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
        <p className="text-sm text-fg-secondary">Sign in to edit events</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
      {/* Modal Header */}
      <div className="px-6 py-4 border-b dark:border-white/5 border-slate-200 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-display font-bold dark:text-white text-slate-900 tracking-tight">Edit Event</h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-accent-primary/60 hover:text-accent-primary transition-colors rounded-full p-1.5 dark:hover:bg-white/5 hover:bg-accent-primary/5"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Modal Body — scrollable */}
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        {/* Event Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event Title"
          maxLength={256}
          className="w-full text-xl sm:text-2xl font-bold font-display dark:text-white text-slate-900 dark:placeholder-gray-600 placeholder-slate-300 border-none focus:ring-0 px-0 bg-transparent"
          disabled={updateEvent.isPending || isUploading}
          required
        />

        {/* Fields */}
        <div className="space-y-3">
          {/* Region */}
          <div>
            <label className="block text-[10px] font-bold dark:text-gray-500 text-slate-500 uppercase tracking-[0.15em] mb-1.5">
              <MapPin className="inline mr-1 text-accent-primary" size={10} />
              Region
            </label>
            <div className="relative">
              <MapPin
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-accent-primary pointer-events-none"
              />
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full pl-8 pr-8 py-2.5 dark:bg-white/5 bg-slate-50 rounded-xl text-sm dark:text-gray-200 text-slate-800 dark:border-accent-primary/20 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-accent-primary/40 focus:border-accent-primary appearance-none cursor-pointer transition-all"
                disabled={updateEvent.isPending || isUploading}
                required
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value} className="dark:bg-[#16151A] bg-white dark:text-gray-200 text-slate-800">
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-primary pointer-events-none"
              />
            </div>
          </div>

          {/* Date & Time grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 dark:bg-white/5 bg-slate-50 rounded-xl p-3 border dark:border-accent-primary/20 border-slate-200 focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/40 transition-all">
              <Calendar size={16} className="text-accent-primary shrink-0" />
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm dark:placeholder-gray-500 placeholder-slate-400 dark:text-gray-200 text-slate-800 dark:[color-scheme:dark]"
                disabled={updateEvent.isPending || isUploading}
                required
              />
            </div>
            <div className="flex items-center gap-2.5 dark:bg-white/5 bg-slate-50 rounded-xl p-3 border dark:border-accent-primary/20 border-slate-200 focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/40 transition-all">
              <Clock size={16} className="text-accent-primary shrink-0" />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm dark:placeholder-gray-500 placeholder-slate-400 dark:text-gray-200 text-slate-800 dark:[color-scheme:dark]"
                disabled={updateEvent.isPending || isUploading}
              />
            </div>
          </div>

          {/* Description */}
          <div className="dark:bg-white/5 bg-slate-50 rounded-xl p-3 border dark:border-accent-primary/20 border-slate-200 focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/40 transition-all">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell everyone about your event..."
              rows={3}
              className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none dark:placeholder-gray-500 placeholder-slate-400 dark:text-gray-200 text-slate-800 leading-relaxed"
              disabled={updateEvent.isPending || isUploading}
              required
            />
          </div>
        </div>

        {/* Image upload */}
        {imagePreview && (
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
              <X size={14} />
            </button>
          </div>
        )}

        {/* Toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableRsvp}
              onChange={(e) => setEnableRsvp(e.target.checked)}
              className="w-3.5 h-3.5 rounded dark:bg-white/5 bg-slate-100 text-accent-primary focus:ring-accent-primary/30 cursor-pointer border-accent-primary/20"
            />
            <span className="text-xs dark:text-gray-400 text-slate-600">Enable RSVP</span>
          </label>
          {enableRsvp && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendReminders}
                onChange={(e) => setSendReminders(e.target.checked)}
                className="w-3.5 h-3.5 rounded dark:bg-white/5 bg-slate-100 text-accent-primary focus:ring-accent-primary/30 cursor-pointer border-accent-primary/20"
              />
              <span className="text-xs dark:text-gray-400 text-slate-600">Send reminders</span>
            </label>
          )}
        </div>
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-4 dark:bg-white/[0.02] bg-accent-primary/[0.02] border-t dark:border-white/5 border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          {!imagePreview && (
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-accent-primary dark:hover:bg-white/5 hover:bg-accent-primary/5 transition-all cursor-pointer group">
              <ImagePlus size={16} className="text-accent-primary" />
              <span className="text-xs font-semibold">Media</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={updateEvent.isPending || isUploading}
              />
            </label>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updateEvent.isPending || isUploading || !title.trim() || !description.trim() || !eventDate || !region}
            className="bg-accent-primary hover:bg-accent-hover text-white px-7 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-accent-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isUploading || updateEvent.isPending ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                {isUploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
