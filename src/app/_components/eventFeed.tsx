// src/app/_components/eventFeed.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import type { RouterOutputs } from '~/trpc/react';
import { useUploadThing } from '~/lib/uploadthing';
import { Heart, MessageCircle, UploadCloud, X, Send } from 'lucide-react';

type EventWithDetails = RouterOutputs['event']['getPublicEvents'][number];

// Re-defining the futuristic styles for consistency
const BG_ELEGANT_DARK = "bg-gray-950/95 backdrop-blur-sm";
const TEXT_LIGHT = "text-gray-50";
const ACCENT_TEXT = "text-lime-400";
const BORDER_SUBTLE = "border-gray-800";
const GLOW_SHADOW_SM = "shadow-lg shadow-lime-400/10";
const CONTAINER_CARD_STYLE = `${BG_ELEGANT_DARK} rounded-xl shadow-2xl ${GLOW_SHADOW_SM} border ${BORDER_SUBTLE} p-6 transition duration-300 hover:border-lime-700/50`;
const INPUT_STYLE = `flex-grow p-2 border ${BORDER_SUBTLE} rounded-lg text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 bg-gray-900 ${TEXT_LIGHT} placeholder-gray-500`;
const BUTTON_PRIMARY_STYLE = `px-4 py-2 bg-lime-600 ${TEXT_LIGHT} text-sm font-medium rounded-lg hover:bg-lime-500 disabled:bg-gray-700 disabled:text-gray-500 transition duration-300 shadow-md shadow-lime-500/30`;


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
    // Card Style Applied
    <div className={`${CONTAINER_CARD_STYLE} mb-8`}>
      
      {/* Event Header */}
      <div className={`flex items-start mb-4 border-b ${BORDER_SUBTLE} pb-4`}>
        <Image 
          src={event.author.image ?? '/default-avatar.png'} 
          alt={event.author.name ?? 'Author'} 
          width={40} 
          height={40} 
          className="rounded-full mr-3 border border-lime-500/50" // Avatar Border
        />
        <div>
          <h2 className={`text-xl font-bold ${TEXT_LIGHT} tracking-wide`}>{event.title}</h2>
          <p className={`text-sm ${ACCENT_TEXT} font-mono`}>
            Uploader: {event.author.name} {formatDate(event.eventDate)}
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
            className={`w-full h-auto rounded-lg object-cover border border-lime-700/50 shadow-md shadow-lime-400/20`}
          />
        </div>
      )}

      {/* Event Details */}
      <p className="text-gray-400 mb-4 whitespace-pre-wrap">{event.description}</p>
      
      {/* Actions & Stats */}
      <div className={`flex justify-between items-center text-sm text-gray-500 border-t ${BORDER_SUBTLE} pt-4 mt-4`}>
        <div className="flex space-x-6">
          <button 
            onClick={handleToggleLike} 
            disabled={toggleLike.isPending || !isAuthenticated}
            className={`flex items-center space-x-1 transition duration-200 ${event.hasLiked ? 'text-red-500 drop-shadow-md shadow-red-500/50' : `text-gray-500 hover:${ACCENT_TEXT}`}`}
          >
            <Heart className="w-5 h-5" fill={event.hasLiked ? 'currentColor' : 'none'}/> 
            <span className="font-semibold">{event.likeCount} Reactions</span>
          </button>
          <span className={`flex items-center space-x-1 ${ACCENT_TEXT}`}>
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">{event.commentCount} Log Entries</span>
          </span>
        </div>
      </div>

      {/* Comment Section */}
      <div className="mt-6 border-t border-gray-700 pt-4">
        <h3 className={`text-lg font-semibold ${TEXT_LIGHT} mb-3 border-b border-lime-700/30 pb-1`}>COMMENT LOGS</h3>
        
        {/* Comment List */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar"> {/* Added custom-scrollbar class (requires custom CSS if not in Tailwind config) */}
          {event.comments.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No comments yet. Be the first to deploy a response.</p>
          ) : (
            event.comments.map((comment) => (
              <div key={comment.id} className={`text-sm bg-gray-900/50 p-3 rounded-lg border ${BORDER_SUBTLE} transition hover:border-lime-700/50`}>
                <div className="flex items-start mb-2">
                  <Image 
                    src={comment.author.image ?? '/default-avatar.png'} 
                    alt={comment.author.name ?? 'Commenter'} 
                    width={28} 
                    height={28} 
                    className="rounded-full mr-3 border border-gray-600"
                  />
                  <div className="flex-1">
                    <span className={`font-semibold ${ACCENT_TEXT} text-base`}>{comment.author.name}</span>
                    {comment.text && (
                      <p className="text-gray-300 mt-1">{comment.text}</p>
                    )}
                  </div>
                </div>
                {comment.imageUrl && (
                  <Image
                    src={comment.imageUrl}
                    alt="Comment"
                    width={300}
                    height={200}
                    className="w-full max-w-sm h-auto rounded-lg mt-2 border border-gray-700"
                  />
                )}
              </div>
            ))
          )}
        </div>
        
        {/* New Comment Form */}
        {isAuthenticated && (
          <form onSubmit={handleCommentSubmit} className="mt-6 space-y-3 p-4 bg-gray-900/50 rounded-lg border border-lime-700/30">
            {commentImagePreview && (
              <div className="relative inline-block">
                <Image
                  src={commentImagePreview}
                  alt="Preview"
                  width={200}
                  height={150}
                  className="rounded-lg border border-gray-700"
                />
                <button
                  type="button"
                  onClick={removeCommentImage}
                  className="absolute -top-2 -right-2 bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition border border-gray-900"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <div className="flex space-x-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Submit encrypted log data..."
                className={INPUT_STYLE}
                disabled={addComment.isPending || isUploadingComment}
              />
              <label 
                className={`flex items-center justify-center px-3 py-2 border ${BORDER_SUBTLE} rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 ${ACCENT_TEXT} transition`}
                title="Attach Image Data"
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCommentImageChange}
                  className="hidden"
                  disabled={addComment.isPending || isUploadingComment}
                />
                <UploadCloud className="w-5 h-5" />
              </label>
              <button
                type="submit"
                disabled={addComment.isPending || isUploadingComment || (!commentText.trim() && !commentImageFile)}
                className={BUTTON_PRIMARY_STYLE}
              >
                {isUploadingComment ? 'UPLOADING...' : <Send className="w-5 h-5" />}
              </button>
            </div>
          </form>
        )}
        {!isAuthenticated && (
            <p className="mt-4 text-center text-sm text-gray-500 font-mono">:: Access Denied. User authentication required for log submission. ::</p>
        )}
      </div>
    </div>
  );
};

export const EventFeed: React.FC = () => {
  const { data: events, isLoading, error } = api.event.getPublicEvents.useQuery();

  if (isLoading) {
    return <div className={`text-center p-10 ${TEXT_LIGHT} font-mono`}>:: Awaiting Data Stream... ::</div>;
  }

  if (error) {
    return <div className={`text-center p-10 text-red-500 font-mono`}>:: ERROR: Failed to establish data link. {error.message} ::</div>;
  }

  if (!events || events.length === 0) {
    return <div className={`text-center p-10 ${TEXT_LIGHT} font-mono`}>:: NO ACTIVE EVENTS FOUND ::</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 bg-gray-900">
      <h1 className={`text-4xl font-extrabold ${ACCENT_TEXT} mb-8 border-b border-lime-700/50 pb-4 tracking-widest`}>EVENT CONSOLE</h1>
      <div className="w-full">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};