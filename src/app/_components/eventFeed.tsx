// src/app/_components/eventFeed.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import type { RouterOutputs } from '~/trpc/react';
import { useUploadThing } from '~/lib/uploadthing';

type EventWithDetails = RouterOutputs['event']['getPublicEvents'][number];

const EventCard: React.FC<{ event: EventWithDetails }> = ({ event }) => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [commentText, setCommentText] = useState('');
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isUploadingComment, setIsUploadingComment] = useState(false);
  const isAuthenticated = !!session;
  
  const { startUpload } = useUploadThing("imageUploader");
  
  const addComment = api.event.addComment.useMutation({
    onSuccess: () => {
      void utils.event.getPublicEvents.invalidate();
      setCommentText('');
      setCommentImageFile(null);
      setCommentImagePreview(null);
    },
  });

  const toggleLike = api.event.toggleLike.useMutation({
    onSuccess: () => {
      void utils.event.getPublicEvents.invalidate();
    },
  });

  const handleCommentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeCommentImage = () => {
    setCommentImageFile(null);
    setCommentImagePreview(null);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || (!commentText.trim() && !commentImageFile)) return;

    try {
      setIsUploadingComment(true);
      let imageUrl: string | undefined;

      if (commentImageFile) {
        const uploadResult = await startUpload([commentImageFile]);
        imageUrl = uploadResult?.[0]?.url;
      }

      addComment.mutate({
        eventId: event.id,
        text: commentText.trim() || '',
        imageUrl,
      });
    } catch (error) {
      alert('Failed to upload image');
      console.error(error);
    } finally {
      setIsUploadingComment(false);
    }
  };

  const handleToggleLike = () => {
    if (!isAuthenticated) return alert('You must be logged in to like an event.');
    toggleLike.mutate({ eventId: event.id });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
      
      {/* Event Header */}
      <div className="flex items-start mb-4 border-b pb-4">
        <Image 
          src={event.author.image ?? '/default-avatar.png'} 
          alt={event.author.name ?? 'Author'} 
          width={40} 
          height={40} 
          className="rounded-full mr-3"
        />
        <div>
          <h2 className="text-xl font-bold text-gray-800">{event.title}</h2>
          <p className="text-sm text-indigo-600 font-medium">
            By {event.author.name} &bull; {formatDate(event.eventDate)}
          </p>
        </div>
      </div>

      {/* Event Image */}
      {event.imageUrl && (
        <div className="mb-4">
          <Image
            src={event.imageUrl}
            alt={event.title}
            width={800}
            height={400}
            className="w-full h-auto rounded-lg object-cover"
          />
        </div>
      )}

      {/* Event Details */}
      <p className="text-gray-600 mb-4 whitespace-pre-wrap">{event.description}</p>
      
      {/* Actions & Stats */}
      <div className="flex justify-between items-center text-sm text-gray-500 border-t pt-4 mt-4">
        <div className="flex space-x-4">
          <button 
            onClick={handleToggleLike} 
            disabled={toggleLike.isPending || !isAuthenticated}
            className={`flex items-center space-x-1 transition ${event.hasLiked ? 'text-red-500' : 'hover:text-red-500'}`}
          >
            <svg 
              className="w-5 h-5" 
              fill={event.hasLiked ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-.318-.318a4.5 4.5 0 00-6.364 0z"></path>
            </svg>
            <span>{event.likeCount} Likes</span>
          </button>
          <span className="flex items-center space-x-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"></path></svg>
            <span>{event.commentCount} Comments</span>
          </span>
        </div>
      </div>

      {/* Comment Section */}
      <div className="mt-6 border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Comments ({event.commentCount})</h3>
        
        {/* Comment List */}
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {event.comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments yet. Be the first!</p>
          ) : (
            event.comments.map((comment) => (
              <div key={comment.id} className="text-sm bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start mb-2">
                  <Image 
                    src={comment.author.image ?? '/default-avatar.png'} 
                    alt={comment.author.name ?? 'Commenter'} 
                    width={24} 
                    height={24} 
                    className="rounded-full mr-2"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-800">{comment.author.name}</span>
                    {comment.text && (
                      <p className="text-gray-600 mt-1">{comment.text}</p>
                    )}
                  </div>
                </div>
                {comment.imageUrl && (
                  <Image
                    src={comment.imageUrl}
                    alt="Comment"
                    width={300}
                    height={200}
                    className="w-full max-w-sm h-auto rounded-lg mt-2"
                  />
                )}
              </div>
            ))
          )}
        </div>
        
        {/* New Comment Form */}
        {isAuthenticated && (
          <form onSubmit={handleCommentSubmit} className="mt-4 space-y-2">
            {commentImagePreview && (
              <div className="relative inline-block">
                <Image
                  src={commentImagePreview}
                  alt="Preview"
                  width={200}
                  height={150}
                  className="rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeCommentImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-grow p-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                disabled={addComment.isPending || isUploadingComment}
              />
              <label className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCommentImageChange}
                  className="hidden"
                  disabled={addComment.isPending || isUploadingComment}
                />
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </label>
              <button
                type="submit"
                disabled={addComment.isPending || isUploadingComment || (!commentText.trim() && !commentImageFile)}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
              >
                {isUploadingComment ? 'Uploading...' : 'Post'}
              </button>
            </div>
          </form>
        )}
        {!isAuthenticated && (
            <p className="mt-4 text-center text-sm text-gray-500">Log in to post comments.</p>
        )}
      </div>
    </div>
  );
};

export const EventFeed: React.FC = () => {
  const { data: events, isLoading, error } = api.event.getPublicEvents.useQuery();

  if (isLoading) {
    return <div className="text-center p-10 text-gray-600">Loading events...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-600">Error loading events: {error.message}</div>;
  }

  if (!events || events.length === 0) {
    return <div className="text-center p-10 text-gray-600">No events published yet.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 border-b pb-4">Upcoming Events</h1>
      <div className="w-full">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};