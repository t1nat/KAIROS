// src/app/_components/createEventForm.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useUploadThing } from '~/lib/uploadthing';
import Image from 'next/image';
import { Plus, X, UploadCloud, CalendarCheck } from 'lucide-react'; // Added Lucide icons for elegance

// Base Styles: Dark Background, White Text, Neon Blue Accent
const NEON_BLUE = 'text-cyan-400';
const BG_DARK = 'bg-gray-900';
const BORDER_FUTURISTIC = 'border-gray-700 hover:border-cyan-400 focus:ring-cyan-400';
const INPUT_STYLE = `w-full p-3 border ${BORDER_FUTURISTIC} rounded-lg ${BG_DARK} text-white transition-all duration-200 focus:ring-2 focus:border-cyan-400`;
const LABEL_STYLE = `block text-sm font-medium ${NEON_BLUE} mb-1`;
const BUTTON_PRIMARY_STYLE = `flex-1 py-3 px-4 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 disabled:bg-cyan-800 disabled:text-gray-400 transition-all duration-200 shadow-lg hover:shadow-cyan-500/50`;
const BUTTON_SECONDARY_STYLE = `px-6 py-3 border border-gray-600 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 transition-all duration-200`;


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
      reader.onloadend = () => {
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

      // Upload image if present
      if (imageFile) {
        const uploadResult = await startUpload([imageFile]);
        imageUrl = uploadResult?.[0]?.url;

      }

      // Create event with image URL
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
      <div className={`${BG_DARK} p-6 rounded-xl shadow-2xl border border-gray-700 mb-8`}>
        <p className="text-center text-gray-400">
          Please log in to create events.
        </p>
      </div>
    );
  }

  return (
    <div className={`${BG_DARK} p-6 rounded-xl shadow-2xl border border-gray-700 mb-8`}>
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className={`w-full py-3 px-4 flex items-center justify-center ${BUTTON_PRIMARY_STYLE}`}
        >
          <Plus className="w-5 h-5 mr-2" />
          **Create New Event**
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white tracking-wider">NEW EVENT LOG</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-cyan-400 p-1 rounded transition"
              title="Close Form"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label htmlFor="title" className={LABEL_STYLE}>
              Event Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer BBQ Party"
              maxLength={256}
              className={INPUT_STYLE}
              disabled={createEvent.isPending || isUploading}
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className={LABEL_STYLE}>
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your event..."
              rows={4}
              className={`${INPUT_STYLE} resize-none`}
              disabled={createEvent.isPending || isUploading}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className={LABEL_STYLE}>
              Event Image (optional)
            </label>
            {imagePreview ? (
              <div className="relative border border-gray-700 rounded-lg">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={400}
                  height={300}
                  // Adjusted height and object-cover for cleaner look
                  className="w-full h-40 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  // Dark, elegant removal button
                  className="absolute top-2 right-2 bg-red-600/80 text-white rounded-full p-1.5 hover:bg-red-500 transition shadow-lg"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>
            ) : (
              // Futuristic dashed border upload area
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center hover:border-cyan-400 transition">
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
                  <UploadCloud className="w-10 h-10 text-gray-500 mb-2" />
                  <span className="text-sm text-gray-400">Click to upload image file</span>
                  <span className="text-xs text-gray-600 mt-1">PNG, JPG recommended</span>
                </label>
              </div>
            )}
          </div>

          {/* Event Date Input */}
          <div>
            <label htmlFor="eventDate" className={LABEL_STYLE}>
              Event Date & Time *
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={INPUT_STYLE}
              disabled={createEvent.isPending || isUploading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={createEvent.isPending || isUploading || !title.trim() || !description.trim() || !eventDate}
              className={BUTTON_PRIMARY_STYLE}
            >
              <CalendarCheck className="w-5 h-5 mr-2" />
              {isUploading ? 'UPLOADING...' : createEvent.isPending ? 'PUBLISHING...' : 'PUBLISH EVENT'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={createEvent.isPending || isUploading}
              className={BUTTON_SECONDARY_STYLE}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};