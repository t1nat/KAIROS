"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  X,
  Calendar,
  User,
  Send,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MapPin,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
import { api } from "~/trpc/react";
import Image from "next/image";
import { useSession } from "next-auth/react";

const REGIONS = [
  { value: '', label: 'All Regions' }, 
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

interface Author {
  id?: string | null; 
  name: string | null;
  image: string | null;
}

interface Comment {
  id: number;
  text: string;
  imageUrl: string | null;
  createdAt: Date;
  author: Author;
}

interface RsvpCounts {
  going: number;
  maybe: number;
  notGoing: number;
}

interface EventWithDetails {
  id: number;
  title: string;
  description: string;
  eventDate: Date;
  imageUrl: string | null;
  region: string;
  enableRsvp: boolean;
  likeCount: number;
  commentCount: number;
  hasLiked: boolean;
  userRsvpStatus: "going" | "maybe" | "not_going" | null;
  rsvpCounts: RsvpCounts;
  author: Author;
  comments: Comment[];
  createdById: string; 
  isOwner: boolean;
}

// Optimistic update hooks
function useOptimisticLike(eventId: number) {
  const utils = api.useUtils();
  const toggleLike = api.event.toggleLike.useMutation({
    onMutate: async () => {
      await utils.event.getPublicEvents.cancel();
      const previousEvents = utils.event.getPublicEvents.getData();

      utils.event.getPublicEvents.setData(undefined, (old) => {
        if (!old) return old;
        
        return old.map((event) => {
          if (event.id === eventId) {
            const wasLiked = event.hasLiked;
            return {
              ...event,
              hasLiked: !wasLiked,
              likeCount: wasLiked ? event.likeCount - 1 : event.likeCount + 1,
            };
          }
          return event;
        });
      });

      return { previousEvents };
    },
    
    onError: (_err, _variables, context) => {
      if (context?.previousEvents) {
        utils.event.getPublicEvents.setData(undefined, context.previousEvents);
      }
    },
    
    onSettled: () => {
      void utils.event.getPublicEvents.invalidate();
    },
  });

  return toggleLike;
}

function useOptimisticRsvp(eventId: number) {
  const utils = api.useUtils();
  const updateRsvp = api.event.updateRsvp.useMutation({
    onMutate: async ({ status }) => {
      await utils.event.getPublicEvents.cancel();
      const previousEvents = utils.event.getPublicEvents.getData();

      utils.event.getPublicEvents.setData(undefined, (old) => {
        if (!old) return old;
        
        return old.map((event) => {
          if (event.id === eventId) {
            const oldStatus = event.userRsvpStatus;
            const newCounts = { ...event.rsvpCounts };
            
            if (oldStatus === "going") newCounts.going--;
            else if (oldStatus === "maybe") newCounts.maybe--;
            else if (oldStatus === "not_going") newCounts.notGoing--;
            
            if (status === "going") newCounts.going++;
            else if (status === "maybe") newCounts.maybe++;
            else if (status === "not_going") newCounts.notGoing++;
            
            return {
              ...event,
              userRsvpStatus: status,
              rsvpCounts: newCounts,
            };
          }
          return event;
        });
      });

      return { previousEvents };
    },
    
    onError: (_err, _variables, context) => {
      if (context?.previousEvents) {
        utils.event.getPublicEvents.setData(undefined, context.previousEvents);
      }
    },
    
    onSettled: () => {
      void utils.event.getPublicEvents.invalidate();
    },
  });

  return updateRsvp;
}

const InfoMessageToast: React.FC<{
  message: string | null;
  type: "error" | "info" | null;
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const color =
    type === "error"
      ? "bg-red-500/10 border-red-500/30 text-red-300"
      : "bg-blue-500/10 border-blue-500/30 text-blue-300";

  const Icon = type === "error" ? AlertCircle : Check;

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-xl border shadow-lg z-50 transition-opacity duration-300 ${color}`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className="flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

const RsvpDashboard: React.FC<{ event: EventWithDetails; onClose: () => void }> = ({ event, onClose }) => {
  const totalRsvps = event.rsvpCounts.going + event.rsvpCounts.maybe + event.rsvpCounts.notGoing;
  const goingPercentage = totalRsvps > 0 ? (event.rsvpCounts.going / totalRsvps) * 100 : 0;
  const maybePercentage = totalRsvps > 0 ? (event.rsvpCounts.maybe / totalRsvps) * 100 : 0;
  const notGoingPercentage = totalRsvps > 0 ? (event.rsvpCounts.notGoing / totalRsvps) * 100 : 0;

  const formatEventDateTime = (date: Date) => {
    const eventDate = new Date(date);
    const dateStr = eventDate.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} at ${timeStr}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1E252D] rounded-2xl border border-white/10 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1E252D] z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="sm:w-5 sm:h-5 text-[#A343EC]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#FBF9F5]">Responses Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#E4DEEA] hover:text-[#FBF9F5] hover:bg-white/5 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="bg-white/5 rounded-xl p-4 sm:p-5 border border-white/10">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-[#A343EC]" size={20} />
              <h3 className="text-base sm:text-lg font-semibold text-[#FBF9F5]">Total Responses</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-[#A343EC] mt-2">{totalRsvps}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#E4DEEA] flex items-center gap-2">
              <TrendingUp size={16} />
              Response Breakdown
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span className="text-[#E4DEEA] font-medium">Going</span>
                </div>
                <span className="text-[#FBF9F5] font-semibold">{event.rsvpCounts.going}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${goingPercentage}%` }}
                />
              </div>
              <p className="text-xs text-[#59677C] text-right">{goingPercentage.toFixed(1)}%</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} className="text-yellow-400" />
                  <span className="text-[#E4DEAA] font-medium">Maybe</span>
                </div>
                <span className="text-[#FBF9F5] font-semibold">{event.rsvpCounts.maybe}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-500"
                  style={{ width: `${maybePercentage}%` }}
                />
              </div>
              <p className="text-xs text-[#59677C] text-right">{maybePercentage.toFixed(1)}%</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-[#E4DEAA] font-medium">Can&apos;t Go</span>
                </div>
                <span className="text-[#FBF9F5] font-semibold">{event.rsvpCounts.notGoing}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-500"
                  style={{ width: `${notGoingPercentage}%` }}
                />
              </div>
              <p className="text-xs text-[#59677C] text-right">{notGoingPercentage.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <h4 className="text-sm font-semibold text-[#E4DEAA] mb-2">Event Details</h4>
            <p className="text-[#FBF9F5] font-medium mb-1">{event.title}</p>
            <div className="flex items-center gap-2 text-xs text-[#59677C]">
              <Calendar size={14} />
              <span>{formatEventDateTime(event.eventDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventCard: React.FC<{ event: EventWithDetails }> = ({ event }) => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDashboard, setShowDashboard] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{
    message: string;
    type: "error" | "info";
  } | null>(null);

  // Use optimistic hooks instead of regular mutations
  const toggleLike = useOptimisticLike(event.id);
  const updateRsvp = useOptimisticRsvp(event.id);

  const addComment = api.event.addComment.useMutation({
    onSuccess: () => {
      setCommentText("");
      void utils.event.getPublicEvents.invalidate();
    },
    onError: (error) => {
      setInfoMessage({ message: error.message, type: "error" });
    },
  });

  const handleLike = () => {
    if (!session) {
      setInfoMessage({ message: "Please sign in to like events", type: "error" });
      return;
    }
    toggleLike.mutate({ eventId: event.id });
  };

  const handleRsvpClick = (status: "going" | "maybe" | "not_going") => {
    if (!session) {
      setInfoMessage({ message: "Please sign in to RSVP", type: "error" });
      return;
    }
    updateRsvp.mutate({ eventId: event.id, status });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      setInfoMessage({ message: "Please sign in to comment", type: "error" });
      return;
    }
    if (!commentText.trim()) return;

    addComment.mutate({
      eventId: event.id,
      text: commentText.trim(),
    });
  };

  const formatDate = (date: Date) => {
    const eventDate = new Date(date);
    const dateStr = eventDate.toLocaleDateString('en-US', { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric' 
    });
    const timeStr = eventDate.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} at ${timeStr}`;
  };

  const getRegionLabel = (value: string) => {
    return REGIONS.find(r => r.value === value)?.label ?? value;
  };

  const isPastEvent = new Date(event.eventDate) < new Date();
  const sortedComments = (event.comments ?? []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const displayedComments = showAllComments
    ? sortedComments
    : sortedComments.slice(0, 3);

  return (
    <>
      <div className="mb-8 pb-8 border-b border-white/5 last:border-0 transition-all duration-300">
        <InfoMessageToast
          message={infoMessage?.message ?? null}
          type={infoMessage?.type ?? null}
          onClose={() => setInfoMessage(null)}
        />

        <div className="px-2 sm:px-4 mb-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 overflow-hidden flex-shrink-0">
              {event.author.image ? (
                <Image
                  src={event.author.image}
                  alt={event.author.name ?? "User"}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={20} className="text-[#E4DEEA]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-[#FBF9F5] mb-2 break-words">
                {event.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[#E4DEAA]">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User size={14} className="sm:w-4 sm:h-4" />
                  <span className="font-medium">{event.author.name}</span>
                </div>

                <span className="text-[#59677C] hidden sm:inline">•</span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MapPin size={14} className="sm:w-4 sm:h-4" />
                  <span>{getRegionLabel(event.region)}</span>
                </div>

                <span className="text-[#59677C] hidden sm:inline">•</span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{formatDate(event.eventDate)}</span>
                  <span className="sm:hidden">{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                {isPastEvent && (
                  <>
                    <span className="text-[#59677C] hidden sm:inline">•</span>
                    <span className="px-2 py-0.5 bg-white/5 rounded text-xs text-[#E4DEAA]">
                      Past Event
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {event.imageUrl && (
          <div className="relative aspect-video bg-white/5 my-4 rounded-lg sm:rounded-xl overflow-hidden">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="px-2 sm:px-4 mb-4">
          <p className="text-sm sm:text-base text-[#E4DEAA] whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>

        {event.enableRsvp && (
          <div className="px-2 sm:px-4 mb-4">
            <div className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-semibold text-[#E4DEAA]">
                  Will you come?
                </h3>
                {event.isOwner && (
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#A343EC]/20 hover:bg-[#A343EC]/30 text-[#A343EC] rounded-lg transition-colors text-xs sm:text-sm font-medium"
                  >
                    <BarChart3 size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">View Stats</span>
                    <span className="sm:hidden">Stats</span>
                  </button>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => handleRsvpClick("going")}
                  disabled={updateRsvp.isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all ${
                    event.userRsvpStatus === "going"
                      ? "bg-green-500/20 border-green-500/50 text-green-300"
                      : "border-white/10 text-[#E4DEAA] hover:bg-white/5"
                  }`}
                >
                  <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Going ({event.rsvpCounts.going})</span>
                </button>
                <button
                  onClick={() => handleRsvpClick("maybe")}
                  disabled={updateRsvp.isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all ${
                    event.userRsvpStatus === "maybe"
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                      : "border-white/10 text-[#E4DEAA] hover:bg-white/5"
                  }`}
                >
                  <HelpCircle size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Maybe ({event.rsvpCounts.maybe})</span>
                </button>
                <button
                  onClick={() => handleRsvpClick("not_going")}
                  disabled={updateRsvp.isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all ${
                    event.userRsvpStatus === "not_going"
                      ? "bg-red-500/20 border-red-500/50 text-red-300"
                      : "border-white/10 text-[#E4DEAA] hover:bg-white/5"
                  }`}
                >
                  <XCircle size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Can&apos;t Go ({event.rsvpCounts.notGoing})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-2 sm:px-4 py-3 border-t border-white/5 flex items-center gap-4 sm:gap-6">
          <button
            onClick={handleLike}
            disabled={toggleLike.isPending}
            className={`flex items-center gap-1.5 sm:gap-2 transition-all ${
              event.hasLiked
                ? "text-red-400"
                : "text-[#E4DEAA] hover:text-red-400"
            }`}
          >
            <Heart
              size={18}
              className={`sm:w-5 sm:h-5 ${event.hasLiked ? "fill-current" : ""}`}
            />
            <span className="text-xs sm:text-sm font-medium">{event.likeCount}</span>
          </button>

          <button className="flex items-center gap-1.5 sm:gap-2 text-[#E4DEAA] hover:text-[#A343EC] transition-colors">
            <MessageCircle size={18} className="sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">{event.commentCount}</span>
          </button>
        </div>

        <div className="border-t border-white/5">
          {displayedComments.length > 0 && (
            <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4">
              {displayedComments.map((comment) => (
                <div key={comment.id} className="flex gap-2 sm:gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 overflow-hidden">
                    {comment.author.image ? (
                      <Image
                        src={comment.author.image}
                        alt={comment.author.name ?? "User"}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={14} className="text-[#E4DEAA]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="bg-white/5 rounded-lg p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm font-semibold text-[#FBF9F5] mb-1">
                        {comment.author.name}
                      </p>
                      <p className="text-xs sm:text-sm text-[#E4DEAA]">{comment.text}</p>
                    </div>
                    <p className="text-xs text-[#59677C] mt-1 ml-2 sm:ml-3">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {sortedComments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="text-xs sm:text-sm text-[#A343EC] hover:text-[#9448F2] font-medium transition-colors"
                >
                  {showAllComments
                    ? "Show less"
                    : `View ${sortedComments.length - 3} more comments`}
                </button>
              )}
            </div>
          )}

          {session && (
            <div className="px-2 sm:px-4 py-4 sm:py-6 border-t border-white/5">
              <div className="flex gap-2 sm:gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 overflow-hidden">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? "You"}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User size={14} className="text-[#E4DEAA]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment(e);
                      }
                    }}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-sm sm:text-base text-[#FBF9F5] placeholder:text-[#59677C]"
                    disabled={addComment.isPending}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={addComment.isPending || !commentText.trim()}
                    className="px-3 sm:px-4 py-2 bg-[#A343EC] text-white rounded-lg hover:bg-[#9448F2] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addComment.isPending ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDashboard && event.isOwner && (
        <RsvpDashboard event={event} onClose={() => setShowDashboard(false)} />
      )}
    </>
  );
};

export const EventFeed: React.FC = () => {
  const { data: session } = useSession();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  

  const { data: eventsData, isLoading, error } = api.event.getPublicEvents.useQuery(undefined, {
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="animate-spin w-12 h-12 text-[#A343EC] mx-auto mb-4" />
        <p className="text-[#E4DEAA]">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-[#FBF9F5] mb-2">
          Error Loading Events
        </h3>
        <p className="text-[#E4DEAA]">{error.message}</p>
      </div>
    );
  }
  
  const filteredEvents = eventsData?.filter(event => 
    selectedRegion === '' || event.region === selectedRegion
  ) ?? [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <MapPin className="text-[#A343EC]" size={18} />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#A343EC] focus:border-transparent transition-all text-sm sm:text-base text-[#FBF9F5] appearance-none cursor-pointer"
            >
              {REGIONS.map((region) => (
                <option key={region.value} value={region.value} className="bg-[#181F25] text-[#FBF9F5]">
                  {region.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!filteredEvents || filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-[#A343EC]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-[#A343EC]" />
          </div>
          <h3 className="text-xl font-semibold text-[#FBF9F5] mb-2">
            No Events Found
          </h3>
          <p className="text-[#E4DEAA]">
            {selectedRegion 
              ? `No events currently listed for ${REGIONS.find(r => r.value === selectedRegion)?.label}.` 
              : `Create your first event to get started!`}
          </p>
        </div>
      ) : (
        <div>
          {filteredEvents.map((event) => (
            <EventCard 
              key={event.id} 
              event={{
                ...event,
                createdById: event.createdById,
                isOwner: session?.user?.id === event.createdById
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};