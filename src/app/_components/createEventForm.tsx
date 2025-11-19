// src/app/_components/CreateEventForm.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useUploadThing } from '~/lib/uploadthing';
import Image from 'next/image';

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
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
        <p className="text-center text-gray-600">
          Please log in to create events.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          + Create New Event
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Create New Event</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Title Input */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Event Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer BBQ Party"
              maxLength={256}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={createEvent.isPending || isUploading}
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your event..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={createEvent.isPending || isUploading}
            />
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
              Event Image (optional)
            </label>
            {imagePreview ? (
              <div className="relative">
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={400}
                  height={300}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-500 transition">
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
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">Click to upload image</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 4MB</span>
                </label>
              </div>
            )}
          </div>

          {/* Event Date Input */}
          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
              Event Date & Time *
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={createEvent.isPending || isUploading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={createEvent.isPending || isUploading || !title.trim() || !description.trim() || !eventDate}
              className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
            >
              {isUploading ? 'Uploading...' : createEvent.isPending ? 'Publishing...' : 'Publish Event'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={createEvent.isPending || isUploading}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};