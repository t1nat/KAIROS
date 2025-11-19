// src/app/_components/createEventForm.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useUploadThing } from '~/lib/uploadthing';
import Image from 'next/image';
import { Plus, X, CalendarCheck, ImagePlus, Loader2 } from 'lucide-react';

// Professional Design System
const CARD_BG = 'bg-white';
const INPUT_BASE = 'w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-slate-900';
const LABEL_STYLE = 'block text-sm font-semibold text-slate-700 mb-2';
const BUTTON_PRIMARY = 'flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:bg-slate-300 disabled:cursor-not-allowed';
const BUTTON_SECONDARY = 'px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all duration-200';

export const CreateEventForm: React.FC = () => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
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

    if (!title.trim() || !description.trim() || !eventDate) {
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
        imageUrl,
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
      <div className={`${CARD_BG} p-8 rounded-2xl shadow-lg border border-slate-200 mb-8`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarCheck size={32} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Authentication Required</h3>
          <p className="text-slate-600">Please sign in to create events</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${CARD_BG} rounded-2xl shadow-lg border border-slate-200 mb-8 overflow-hidden`}>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full p-6 flex items-center justify-center gap-3 text-indigo-600 hover:bg-indigo-50 transition-all duration-300 group"
        >
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
            <Plus size={24} className="text-indigo-600" />
          </div>
          <span className="text-lg font-semibold">Create New Event</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CalendarCheck size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Create New Event</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label htmlFor="title" className={LABEL_STYLE}>
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summer BBQ Party, Team Building Event"
                maxLength={256}
                className={INPUT_BASE}
                disabled={createEvent.isPending || isUploading}
              />
            </div>

            {/* Description Input */}
            <div>
              <label htmlFor="description" className={LABEL_STYLE}>
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your event... What can attendees expect?"
                rows={4}
                className={`${INPUT_BASE} resize-none`}
                disabled={createEvent.isPending || isUploading}
              />
            </div>

            {/* Event Date Input */}
            <div>
              <label htmlFor="eventDate" className={LABEL_STYLE}>
                Event Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                id="eventDate"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className={INPUT_BASE}
                disabled={createEvent.isPending || isUploading}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className={LABEL_STYLE}>
                Event Image <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-slate-200">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={800}
                    height={400}
                    className="w-full h-64 object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-4 right-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-300">
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
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                      <ImagePlus className="text-indigo-600" size={32} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 mb-1">Click to upload image</span>
                    <span className="text-xs text-slate-500">PNG, JPG up to 10MB</span>
                  </label>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={createEvent.isPending || isUploading || !title.trim() || !description.trim() || !eventDate}
                className={`flex-1 ${BUTTON_PRIMARY}`}
              >
                {isUploading || createEvent.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {isUploading ? 'Uploading...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    <CalendarCheck size={20} />
                    Publish Event
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={createEvent.isPending || isUploading}
                className={BUTTON_SECONDARY}
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