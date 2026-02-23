"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  X,
  Calendar,
  User,
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
  Trash2,
  Plus,
} from "lucide-react";
import { api } from "~/trpc/react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { CreateEventForm } from "~/components/events/CreateEventForm";
import { RegionMapPicker, type RegionOption } from "~/components/events/RegionMapPicker";

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

const REGION_MAP: RegionOption[] = [
  { value: "sofia", label: "Sofia", lat: 42.6977, lng: 23.3219 },
  { value: "plovdiv", label: "Plovdiv", lat: 42.1354, lng: 24.7453 },
  { value: "varna", label: "Varna", lat: 43.2141, lng: 27.9147 },
  { value: "burgas", label: "Burgas", lat: 42.5048, lng: 27.4626 },
  { value: "ruse", label: "Ruse", lat: 43.8356, lng: 25.9657 },
  { value: "stara_zagora", label: "Stara Zagora", lat: 42.4258, lng: 25.6345 },
  { value: "pleven", label: "Pleven", lat: 43.4170, lng: 24.6067 },
  { value: "sliven", label: "Sliven", lat: 42.6810, lng: 26.3220 },
  { value: "dobrich", label: "Dobrich", lat: 43.5726, lng: 27.8273 },
  { value: "shumen", label: "Shumen", lat: 43.2706, lng: 26.9229 },
];

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
      <div className="surface-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-4 sm:p-6 flex items-center justify-between sticky top-0 bg-bg-primary/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent-primary/20 rounded-lg flex items-center justify-center">
              <BarChart3 size={18} className="sm:w-5 sm:h-5 text-accent-primary" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-fg-primary">Responses Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="bg-bg-secondary rounded-xl p-4 sm:p-5 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-accent-primary" size={20} />
              <h3 className="text-base sm:text-lg font-semibold text-fg-primary">Total Responses</h3>
            </div>
            <p className="text-3xl sm:text-4xl font-bold text-accent-primary mt-2">{totalRsvps}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-fg-secondary flex items-center gap-2">
              <TrendingUp size={16} />
              Response Breakdown
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-success" />
                  <span className="text-fg-secondary font-medium">Going</span>
                </div>
                <span className="text-fg-primary font-semibold">{event.rsvpCounts.going}</span>
              </div>
              <div className="h-2 bg-bg-surface/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-success transition-all duration-500"
                  style={{ width: `${goingPercentage}%` }}
                />
              </div>
              <p className="text-xs text-fg-tertiary text-right">{goingPercentage.toFixed(1)}%</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HelpCircle size={16} className="text-warning" />
                  <span className="text-fg-secondary font-medium">Maybe</span>
                </div>
                <span className="text-fg-primary font-semibold">{event.rsvpCounts.maybe}</span>
              </div>
              <div className="h-2 bg-bg-surface/60 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-warning transition-all duration-500"
                  style={{ width: `${maybePercentage}%` }}
                />
              </div>
              <p className="text-xs text-fg-tertiary text-right">{maybePercentage.toFixed(1)}%</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <XCircle size={16} className="text-event-critical" />
                  <span className="text-fg-secondary font-medium">Can&apos;t Go</span>
                </div>
                <span className="text-fg-primary font-semibold">{event.rsvpCounts.notGoing}</span>
              </div>
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-event-critical transition-all duration-500"
                  style={{ width: `${notGoingPercentage}%` }}
                />
              </div>
              <p className="text-xs text-fg-tertiary text-right">{notGoingPercentage.toFixed(1)}%</p>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-xl p-4 border border-white/[0.06]">
            <h4 className="text-sm font-semibold text-fg-secondary mb-2">Event Details</h4>
            <p className="text-fg-primary font-medium mb-1">{event.title}</p>
            <div className="flex items-center gap-2 text-xs text-fg-tertiary">
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
  const [deleteEventArmed, setDeleteEventArmed] = useState(false);
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

  const deleteEvent = api.event.deleteEvent.useMutation({
    onMutate: async () => {
      await utils.event.getPublicEvents.cancel();
      const previousEvents = utils.event.getPublicEvents.getData();

      utils.event.getPublicEvents.setData(undefined, (old) => {
        if (!old) return old;
        return old.filter((e) => e.id !== event.id);
      });

      return { previousEvents };
    },
    onError: (error, _variables, context) => {
      if (context?.previousEvents) {
        utils.event.getPublicEvents.setData(undefined, context.previousEvents);
      }
      setInfoMessage({ message: error.message, type: "error" });
    },
    onSuccess: () => {
      setShowDashboard(false);
      setDeleteEventArmed(false);
      setInfoMessage({ message: "Event deleted", type: "info" });
    },
    onSettled: () => {
      void utils.event.getPublicEvents.invalidate();
    },
  });

  useEffect(() => {
    if (!deleteEventArmed) return;
    const tId = setTimeout(() => setDeleteEventArmed(false), 4000);
    return () => clearTimeout(tId);
  }, [deleteEventArmed]);

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

  const handleDeleteEvent = () => {
    if (!session) {
      setInfoMessage({ message: "Please sign in to delete events", type: "error" });
      return;
    }

    if (!event.isOwner) return;

    if (!deleteEventArmed) {
      setDeleteEventArmed(true);
      setInfoMessage({ message: "Click again to delete event", type: "info" });
      return;
    }

    deleteEvent.mutate({ eventId: event.id });
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
      <div className="bg-bg-secondary border-b border-white/[0.06] sm:rounded-xl sm:border sm:border-white/[0.06] sm:mb-4 overflow-hidden" data-testid="event-card">
        <InfoMessageToast
          message={infoMessage?.message ?? null}
          type={infoMessage?.type ?? null}
          onClose={() => setInfoMessage(null)}
        />

        {/* Author header - Instagram style */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-bg-tertiary overflow-hidden flex-shrink-0 ring-2 ring-accent-primary/20">
            {event.author.image ? (
              <Image
                src={event.author.image}
                alt={event.author.name ?? "User"}
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-primary to-accent-secondary">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg-primary truncate">{event.author.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-fg-tertiary">
              <MapPin size={11} />
              <span>{getRegionLabel(event.region)}</span>
              {isPastEvent && (
                <span className="ml-1 px-1.5 py-0.5 bg-fg-tertiary/10 rounded text-[10px] text-fg-tertiary">Past</span>
              )}
            </div>
          </div>
          {event.isOwner && (
            <button
              onClick={handleDeleteEvent}
              disabled={deleteEvent.isPending}
              className={`p-2 rounded-lg transition-all ${
                deleteEventArmed
                  ? "bg-error/10 text-error"
                  : "text-fg-tertiary hover:text-error"
              }`}
              aria-label={deleteEventArmed ? "Confirm delete event" : "Delete event"}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Image - full width like Instagram */}
        {event.imageUrl && (
          <div className="relative aspect-video bg-bg-tertiary overflow-hidden">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Action bar */}
        <div className="px-4 pt-3 flex items-center gap-3">
          <button
            onClick={handleLike}
            disabled={toggleLike.isPending}
            className={`transition-all ${
              event.hasLiked ? "text-red-500" : "text-fg-secondary hover:text-red-500"
            }`}
          >
            <Heart
              size={22}
              className={event.hasLiked ? "fill-current" : ""}
            />
          </button>

          <button className="text-fg-secondary hover:text-fg-primary transition-colors">
            <MessageCircle size={22} />
          </button>
        </div>

        {/* Like count */}
        <div className="px-4 pt-1.5">
          <span className="text-sm font-semibold text-fg-primary">{event.likeCount} likes</span>
        </div>

        {/* Title + Description */}
        <div className="px-4 pt-1.5 pb-2">
          <h2 className="text-sm font-bold text-fg-primary inline mr-1.5">{event.title}</h2>
          <p className="text-sm text-fg-secondary inline whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Date */}
        <div className="px-4 pb-2 flex items-center gap-1.5 text-xs text-fg-tertiary">
          <Calendar size={12} />
          <span>{formatDate(event.eventDate)}</span>
        </div>

        {/* RSVP - compact Instagram-style */}
        {event.enableRsvp && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-fg-tertiary uppercase tracking-wider">RSVP</span>
              {event.isOwner && (
                <button
                  onClick={() => setShowDashboard(true)}
                  className="flex items-center gap-1 text-xs text-accent-primary font-medium">
                  <BarChart3 size={12} />
                  Stats
                </button>
              )}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleRsvpClick("going")}
                disabled={updateRsvp.isPending}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  event.userRsvpStatus === "going"
                    ? "bg-event-positive/20 text-event-positive"
                    : "bg-bg-tertiary text-fg-secondary hover:bg-bg-tertiary/80"
                }`}
              >
                <CheckCircle2 size={12} />
                Going ({event.rsvpCounts.going})
              </button>
              <button
                onClick={() => handleRsvpClick("maybe")}
                disabled={updateRsvp.isPending}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  event.userRsvpStatus === "maybe"
                    ? "bg-event-pending/20 text-event-pending"
                    : "bg-bg-tertiary text-fg-secondary hover:bg-bg-tertiary/80"
                }`}
              >
                <HelpCircle size={12} />
                Maybe ({event.rsvpCounts.maybe})
              </button>
              <button
                onClick={() => handleRsvpClick("not_going")}
                disabled={updateRsvp.isPending}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  event.userRsvpStatus === "not_going"
                    ? "bg-event-critical/20 text-event-critical"
                    : "bg-bg-tertiary text-fg-secondary hover:bg-bg-tertiary/80"
                }`}
              >
                <XCircle size={12} />
                Can&apos;t ({event.rsvpCounts.notGoing})
              </button>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="px-4 pb-3">
          {sortedComments.length > 3 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-xs text-fg-tertiary mb-2 block">
              View all {sortedComments.length} comments
            </button>
          )}

          {displayedComments.length > 0 && (
            <div className="space-y-1.5">
              {displayedComments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <span className="font-semibold text-fg-primary mr-1.5">{comment.author.name}</span>
                  <span className="text-fg-secondary">{comment.text}</span>
                </div>
              ))}
              {showAllComments && sortedComments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(false)}
                  className="text-xs text-fg-tertiary">
                  Show less
                </button>
              )}
            </div>
          )}

          {/* Comment input */}
          {session && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
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
                placeholder="Add a comment..."
                className="flex-1 bg-transparent text-sm text-fg-primary placeholder:text-fg-tertiary focus:outline-none py-1"
                disabled={addComment.isPending}
              />
              <button
                onClick={handleAddComment}
                disabled={addComment.isPending || !commentText.trim()}
                className="text-accent-primary text-sm font-semibold disabled:opacity-30 transition-opacity">
                {addComment.isPending ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  "Post"
                )}
              </button>
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

interface EventFeedProps {
  showCreateForm?: boolean;
}

export const EventFeed: React.FC<EventFeedProps> = ({ showCreateForm = false }) => {
  const { data: session } = useSession();
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  

  const { data: eventsData, isLoading, error } = api.event.getPublicEvents.useQuery(undefined, {
    enabled: true,
  });

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <Loader2 className="animate-spin w-12 h-12 text-accent-primary mx-auto mb-4" />
        <p className="text-fg-secondary">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 bg-event-critical/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-event-critical" />
        </div>
        <h3 className="text-xl font-semibold text-fg-primary mb-2">
          Error Loading Events
        </h3>
        <p className="text-fg-secondary">{error.message}</p>
      </div>
    );
  }
  
  const filteredEvents = eventsData?.filter(event =>
    selectedRegion === '' || event.region === selectedRegion
  ) ?? [];

  return (
    <div className="space-y-6">
      {showCreateForm && session && (
        <div>
          {showForm ? (
            <div className="bg-bg-elevated rounded-2xl border border-white/[0.06] p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-fg-primary">Create Event</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                >
                  <X size={20} className="text-fg-secondary" />
                </button>
              </div>
              <CreateEventForm onSuccess={() => setShowForm(false)} />
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-bg-secondary rounded-2xl border border-white/[0.06] p-4 flex items-center gap-3 text-fg-secondary hover:text-accent-primary hover:bg-accent-primary/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center group-hover:bg-accent-primary/20 transition-colors">
                <Plus size={20} className="text-accent-primary" />
              </div>
              <span className="font-medium">Create new event</span>
            </button>
          )}
        </div>
      )}

      <div>
        <RegionMapPicker
          value={selectedRegion}
          onChange={setSelectedRegion}
          regions={REGION_MAP}
          allowAll
          allLabel="All"
          fallback={
            <div className="bg-bg-secondary rounded-2xl border border-white/[0.06] p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <MapPin className="text-accent-primary" size={18} />
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="flex-1 px-3 sm:px-4 py-2 bg-bg-secondary shadow-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all text-sm sm:text-base text-fg-primary appearance-none cursor-pointer [&>option]:text-fg-primary [&>option]:bg-bg-secondary [color-scheme:dark]"
                >
                  {REGIONS.map((region) => (
                    <option key={region.value} value={region.value}>
                      {region.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          }
        />
      </div>

      {!filteredEvents || filteredEvents.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-accent-primary" />
          </div>
          <h3 className="text-xl font-semibold text-fg-primary mb-2">No Events Found</h3>
          <p className="text-fg-secondary">
            {selectedRegion
              ? `No events currently listed for ${REGIONS.find((r) => r.value === selectedRegion)?.label}.`
              : `Create your first event to get started!`}
          </p>
        </div>
      ) : (
        <div className="sm:space-y-4">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{
                ...event,
                createdById: event.createdById,
                isOwner: session?.user?.id === event.createdById,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};