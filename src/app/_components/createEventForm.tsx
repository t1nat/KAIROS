'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useUploadThing } from '~/lib/uploadthing';
import Image from 'next/image';
import { Plus, X, CalendarCheck, ImagePlus, Loader2, MapPin } from 'lucide-react';

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

export const CreateEventForm: React.FC = () => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [region, setRegion] = useState<string>('sofia');
  const [enableRsvp, setEnableRsvp] = useState(false);
  const [sendReminders, setSendReminders] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { startUpload } = useUploadThing("imageUploader");

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
      setShowForm(false);
      void utils.event.getPublicEvents.invalidate();
    },
    onError: (error) => {
      alert(`Failed to create event: ${error.message}`);
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
      alert('You must be logged in to create an event');
      return;
    }

    if (!title.trim() || !description.trim() || !eventDate || !region) {
      alert('Please fill in all required fields');
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
        sendReminders,
      });
    } catch (error) {
      alert('Failed to upload image');
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!session) {
    return (
      <div className="bg-white/5 backdrop-blur-sm p-6 sm:p-8 rounded-xl sm:rounded-2xl border border-white/10 mb-8">
        <div className="text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#A343EC]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarCheck size={24} className="sm:w-8 sm:h-8 text-[#A343EC]" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[#FBF9F5] mb-2">Authentication Required</h3>
          <p className="text-sm sm:text-base text-[#E4DEEA]">Please sign in to create events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 mb-8 overflow-hidden">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-4 sm:p-6 flex items-center justify-center gap-3 text-[#A343EC] hover:bg-white/5 transition-all duration-300 group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#A343EC]/20 rounded-xl flex items-center justify-center group-hover:bg-[#A343EC]/30 transition-colors">
            <Plus size={20} className="sm:w-6 sm:h-6 text-[#A343EC]" />
          </div>
          <span className="text-base sm:text-lg font-semibold text-[#FBF9F5]">Create New Event</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-4 sm:p-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-white/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
                <CalendarCheck size={16} className="sm:w-5 sm:h-5 text-[#A343EC]" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold text-[#FBF9F5]">Create New Event</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-[#E4DEEA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-colors"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="title" className="block text-xs sm:text-sm font-semibold text-[#E4DEEA] mb-2">
                Event Title <span className="text-[#A343EC]">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summer BBQ Party, Team Building Event"
                maxLength={256}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-sm sm:text-base text-[#FBF9F5] placeholder:text-[#59677C]"
                disabled={createEvent.isPending || isUploading}
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs sm:text-sm font-semibold text-[#E4DEEA] mb-2">
                Description <span className="text-[#A343EC]">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event... What can attendees expect?"
                rows={4}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-sm sm:text-base text-[#FBF9F5] placeholder:text-[#59677C] resize-none"
                disabled={createEvent.isPending || isUploading}
                required
              />
            </div>

            <div>
              <label htmlFor="eventDate" className="block text-xs sm:text-sm font-semibold text-[#E4DEEA] mb-2">
                Event Date & Time <span className="text-[#A343EC]">*</span>
              </label>
              <input
                id="eventDate"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-sm sm:text-base text-[#FBF9F5]"
                disabled={createEvent.isPending || isUploading}
                required
              />
            </div>

            <div>
              <label htmlFor="region" className="block text-xs sm:text-sm font-semibold text-[#E4DEEA] mb-2">
                <MapPin className="inline mr-1" size={14} />
                Region <span className="text-[#A343EC]">*</span>
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-sm sm:text-base text-[#FBF9F5] appearance-none cursor-pointer"
                disabled={createEvent.isPending || isUploading}
                required
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[#181F25] text-[#FBF9F5]">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-[#E4DEEA] mb-2">
                Event Image <span className="text-[#59677C] font-normal">(optional)</span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-lg sm:rounded-xl overflow-hidden border-2 border-white/10">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={800}
                    height={400}
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-white/10 rounded-lg sm:rounded-xl p-6 sm:p-8 text-center hover:border-[#A343EC]/50 hover:bg-white/5 transition-all duration-300">
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={createEvent.isPending || isUploading}
                  />
                  <label
                    htmlFor="image"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-[#A343EC]/20 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                      <ImagePlus className="text-[#A343EC]" size={24} />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[#E4DEEA] mb-1">Click to upload image</span>
                    <span className="text-xs text-[#59677C]">PNG, JPG up to 10MB</span>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-3 p-3 sm:p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="checkbox"
                  id="enableRsvp"
                  checked={enableRsvp}
                  onChange={(e) => setEnableRsvp(e.target.checked)}
                  className="w-4 h-4 sm:w-5 sm:h-5 rounded border-white/10 bg-white/5 text-[#A343EC] focus:ring-2 focus:ring-[#A343EC] cursor-pointer"
                />
                <label htmlFor="enableRsvp" className="text-xs sm:text-sm font-medium text-[#E4DEEA] cursor-pointer">
                  Enable RSVP for this event
                </label>
              </div>

              {enableRsvp && (
                <div className="flex items-center gap-2 sm:gap-3 ml-6 sm:ml-8">
                  <input
                    type="checkbox"
                    id="sendReminders"
                    checked={sendReminders}
                    onChange={(e) => setSendReminders(e.target.checked)}
                    className="w-4 h-4 sm:w-5 sm:h-5 rounded border-white/10 bg-white/5 text-[#A343EC] focus:ring-2 focus:ring-[#A343EC] cursor-pointer"
                  />
                  <label htmlFor="sendReminders" className="text-xs sm:text-sm font-medium text-[#E4DEEA] cursor-pointer">
                    Send reminders to attendees
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 sm:pt-6 border-t border-white/10">
              <button
                type="submit"
                disabled={createEvent.isPending || isUploading || !title.trim() || !description.trim() || !eventDate || !region}
                className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A343EC]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isUploading || createEvent.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {isUploading ? 'Uploading...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <CalendarCheck size={18} />
                    Publish Event
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={createEvent.isPending || isUploading}
                className="px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-white/10 text-[#E4DEEA] font-semibold rounded-lg hover:bg-white/5 transition-all text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};