// src/app/_components/CreateEventForm.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';

export const CreateEventForm: React.FC = () => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [showForm, setShowForm] = useState(false);

  const createEvent = api.event.createEvent.useMutation({
    onSuccess: () => {
      // Clear form
      setTitle('');
      setDescription('');
      setEventDate('');
      setShowForm(false);
      
      // Refetch events to show the new one
      void utils.event.getPublicEvents.invalidate();
    },
    onError: (error) => {
      alert(`Failed to create event: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      alert('You must be logged in to create an event');
      return;
    }

    if (!title.trim() || !description.trim() || !eventDate) {
      alert('Please fill in all fields');
      return;
    }

    createEvent.mutate({
      title: title.trim(),
      description: description.trim(),
      eventDate: new Date(eventDate),
    });
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
              Event Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Summer BBQ Party"
              maxLength={256}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={createEvent.isPending}
            />
          </div>

          {/* Description Input */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your event..."
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={createEvent.isPending}
            />
          </div>

          {/* Event Date Input */}
          <div>
            <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
              Event Date & Time
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={createEvent.isPending}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={createEvent.isPending || !title.trim() || !description.trim() || !eventDate}
              className="flex-1 py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition"
            >
              {createEvent.isPending ? 'Publishing...' : 'Publish Event'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              disabled={createEvent.isPending}
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