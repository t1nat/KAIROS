// src/app/_components/eventFeed.tsx
'use client';

import React, { useState } from 'react';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import type { RouterOutputs } from '~/trpc/react';
import { useUploadThing } from '~/lib/uploadthing';
import { Heart, MessageCircle, UploadCloud, X, Send, Calendar, User, Loader2 } from 'lucide-react';

type EventWithDetails = RouterOutputs['event']['getPublicEvents'][number];

const EventCard: React.FC<{ event: EventWithDetails }> = ({ event }) => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [commentText, setCommentText] = useState('');
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [isUploadingComment, setIsUploadingComment] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
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

  const displayedComments = showAllComments ? event.comments : event.comments.slice(0, 3);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden mb-6 hover:border-white/20 transition-all duration-300">
      
      {/* Event Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-start gap-4">
          <Image 
            src={event.author.image ?? '/default-avatar.png'} 
            alt={event.author.name ?? 'Author'} 
            width={48} 
            height={48} 
            className="rounded-full object-cover ring-2 ring-white/10" 
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-[#FBF9F5] mb-2 break-words">{event.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#E4DEEA]">
              <div className="flex items-center gap-2">
                <User size={16} />
                <span className="font-medium">{event.author.name}</span>
              </div>
              <span className="text-[#59677C]">•</span>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(event.eventDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Image */}
      {event.imageUrl && (
        <div className="relative aspect-video bg-black/20">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Event Details */}
      <div className="p-6">
        <p className="text-[#E4DEEA] whitespace-pre-wrap leading-relaxed">{event.description}</p>
      </div>
      
      {/* Actions & Stats */}
      <div className="px-6 py-4 border-t border-white/10 bg-white/5">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleToggleLike} 
            disabled={toggleLike.isPending || !isAuthenticated}
            className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
              event.hasLiked 
                ? 'text-[#A343EC]' 
                : 'text-[#E4DEEA] hover:text-[#A343EC]'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Heart 
              size={20} 
              fill={event.hasLiked ? 'currentColor' : 'none'}
              className={event.hasLiked ? 'animate-pulse' : ''}
            /> 
            <span>{event.likeCount} {event.likeCount === 1 ? 'Like' : 'Likes'}</span>
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-[#E4DEEA]">
            <MessageCircle size={20} />
            <span>{event.commentCount} {event.commentCount === 1 ? 'Comment' : 'Comments'}</span>
          </div>
        </div>
      </div>

      {/* Comment Section */}
      <div className="border-t border-white/10">
        <div className="p-6">
          <h3 className="text-lg font-bold text-[#FBF9F5] mb-4">Comments</h3>
          
          {/* Comment List */}
          {event.comments.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={48} className="text-[#59677C] mx-auto mb-3" />
              <p className="text-sm text-[#E4DEEA]">No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-4">
                {displayedComments.map((comment) => (
                  <div key={comment.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-start gap-3 mb-3">
                      <Image 
                        src={comment.author.image ?? '/default-avatar.png'} 
                        alt={comment.author.name ?? 'Commenter'} 
                        width={36} 
                        height={36} 
                        className="rounded-full object-cover ring-2 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[#FBF9F5]">{comment.author.name}</span>
                        {comment.text && (
                          <p className="text-[#E4DEEA] mt-1 break-words">{comment.text}</p>
                        )}
                      </div>
                    </div>
                    {comment.imageUrl && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-white/10">
                        <Image
                          src={comment.imageUrl}
                          alt="Comment"
                          width={400}
                          height={300}
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {event.comments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="text-sm font-medium text-[#A343EC] hover:text-[#9448F2] transition-colors mb-4"
                >
                  {showAllComments 
                    ? 'Show less' 
                    : `View ${event.comments.length - 3} more ${event.comments.length - 3 === 1 ? 'comment' : 'comments'}`
                  }
                </button>
              )}
            </>
          )}
          
          {/* New Comment Form */}
          {isAuthenticated ? (
            <form onSubmit={handleCommentSubmit} className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              {commentImagePreview && (
                <div className="relative inline-block mb-3">
                  <Image
                    src={commentImagePreview}
                    alt="Preview"
                    width={200}
                    height={150}
                    className="rounded-lg border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={removeCommentImage}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-[#FBF9F5] placeholder:text-[#59677C]"
                  disabled={addComment.isPending || isUploadingComment}
                />
                <label 
                  className="flex items-center justify-center px-3 py-2 border border-white/10 rounded-lg cursor-pointer hover:bg-white/5 text-[#E4DEEA] hover:text-[#A343EC] transition-all"
                  title="Attach Image"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCommentImageChange}
                    className="hidden"
                    disabled={addComment.isPending || isUploadingComment}
                  />
                  <UploadCloud size={20} />
                </label>
                <button
                  type="submit"
                  disabled={addComment.isPending || isUploadingComment || (!commentText.trim() && !commentImageFile)}
                  className="px-4 py-2 bg-gradient-to-r from-[#A343EC] to-[#9448F2] text-white text-sm font-semibold rounded-lg hover:shadow-lg hover:shadow-[#A343EC]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingComment || addComment.isPending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10 text-center">
              <p className="text-sm text-[#E4DEEA]">Sign in to comment on this event</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const EventFeed: React.FC = () => {
  const { data: events, isLoading, error } = api.event.getPublicEvents.useQuery();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-[#A343EC] animate-spin mb-4" />
        <p className="text-[#E4DEEA]">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <X size={32} className="text-red-500" />
        </div>
        <h3 className="text-xl font-semibold text-[#FBF9F5] mb-2">Error Loading Events</h3>
        <p className="text-[#E4DEEA]">{error.message}</p>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-[#A343EC]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calendar size={32} className="text-[#A343EC]" />
        </div>
        <h3 className="text-xl font-semibold text-[#FBF9F5] mb-2">No Events Yet</h3>
        <p className="text-[#E4DEEA]">Be the first to create an event!</p>
      </div>
    );
  }

  return (
    <div>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};