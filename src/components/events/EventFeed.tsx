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
          <div className="bg-bg-secondary rounded-xl p-4 sm:p-5 ios-card">
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

          <div className="bg-bg-secondary rounded-xl p-4 ios-card">
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
      <div className="card-interactive mb-8 pb-8 last:mb-0">
        <InfoMessageToast
          message={infoMessage?.message ?? null}
          type={infoMessage?.type ?? null}
          onClose={() => setInfoMessage(null)}
        />

        <div className="px-2 sm:px-4 mb-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-bg-secondary overflow-hidden flex-shrink-0">
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
                  <User size={20} className="text-fg-secondary" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-fg-primary mb-2 break-words flex-1 min-w-0">
                  {event.title}
                </h2>
                {event.isOwner && (
                  <button
                    onClick={handleDeleteEvent}
                    disabled={deleteEvent.isPending}
                    className={`p-2 rounded-lg transition-all ${
                      deleteEventArmed
                        ? "bg-error/10 text-error"
                        : "text-fg-secondary hover:text-error hover:bg-bg-secondary"
                    }`}
                    aria-label={deleteEventArmed ? "Confirm delete event" : "Delete event"}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-fg-secondary">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <User size={14} className="sm:w-4 sm:h-4" />
                  <span className="font-medium">{event.author.name}</span>
                </div>

                <span className="text-fg-tertiary hidden sm:inline">•</span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MapPin size={14} className="sm:w-4 sm:h-4" />
                  <span>{getRegionLabel(event.region)}</span>
                </div>

                <span className="text-fg-tertiary hidden sm:inline">•</span>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Calendar size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{formatDate(event.eventDate)}</span>
                  <span className="sm:hidden">{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>

                {isPastEvent && (
                  <>
                    <span className="text-fg-tertiary hidden sm:inline">•</span>
                    <span className="px-2 py-0.5 bg-event-inactive/20 rounded text-xs text-event-inactive">
                      Past Event
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {event.imageUrl && (
          <div className="relative aspect-video bg-bg-secondary my-4 rounded-lg sm:rounded-xl overflow-hidden">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="px-2 sm:px-4 mb-4">
          <p className="text-sm sm:text-base text-fg-secondary whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>

        {event.enableRsvp && (
          <div className="px-2 sm:px-4 mb-4">
            <div className="surface-card rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-semibold text-fg-secondary">
                  Will you come?
                </h3>
                {event.isOwner && (
                  <button
                    onClick={() => setShowDashboard(true)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-accent-primary/20 hover:bg-accent-primary/30 text-accent-primary rounded-lg transition-colors text-xs sm:text-sm font-medium">
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
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all ${
                    event.userRsvpStatus === "going"
                      ? "bg-event-positive/20 text-event-positive"
                      : "bg-bg-surface/50 text-fg-secondary hover:bg-bg-secondary"
                  }`}
                >
                  <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Going ({event.rsvpCounts.going})</span>
                </button>
                <button
                  onClick={() => handleRsvpClick("maybe")}
                  disabled={updateRsvp.isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all ${
                    event.userRsvpStatus === "maybe"
                      ? "bg-event-pending/20 text-event-pending"
                      : "bg-bg-surface/50 text-fg-secondary hover:bg-bg-secondary"
                  }`}
                >
                  <HelpCircle size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Maybe ({event.rsvpCounts.maybe})</span>
                </button>
                <button
                  onClick={() => handleRsvpClick("not_going")}
                  disabled={updateRsvp.isPending}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all ${
                    event.userRsvpStatus === "not_going"
                      ? "bg-event-critical/20 text-event-critical"
                      : "bg-bg-surface/50 text-fg-secondary hover:bg-bg-secondary"
                  }`}
                >
                  <XCircle size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium">Can&apos;t Go ({event.rsvpCounts.notGoing})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="px-2 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleLike}
            disabled={toggleLike.isPending}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all hover:bg-bg-secondary ${
              event.hasLiked
                ? "text-event-critical"
                : "text-fg-secondary hover:text-event-critical"
            }`}
          >
            <Heart
              size={16}
              className={`sm:w-[18px] sm:h-[18px] ${event.hasLiked ? "fill-current" : ""}`}
            />
            <span className="text-xs sm:text-sm font-medium">{event.likeCount}</span>
          </button>

          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-fg-secondary hover:text-accent-primary hover:bg-bg-secondary transition-colors">
            <MessageCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-xs sm:text-sm font-medium">{event.commentCount}</span>
          </button>
        </div>

        <div className="mt-2">
          {displayedComments.length > 0 && (
            <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4">
              {displayedComments.map((comment) => (
                <div key={comment.id} className="flex gap-2 sm:gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-secondary flex-shrink-0 overflow-hidden">
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
                        <User size={14} className="text-fg-secondary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="bg-bg-secondary rounded-lg p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm font-semibold text-fg-primary mb-1">
                        {comment.author.name}
                      </p>
                      <p className="text-xs sm:text-sm text-fg-secondary">{comment.text}</p>
                    </div>
                    <p className="text-xs text-fg-tertiary mt-1 ml-2 sm:ml-3">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}

              {sortedComments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(!showAllComments)}
                  className="text-xs sm:text-sm text-accent-primary hover:text-accent-secondary font-medium transition-colors">
                  {showAllComments
                    ? "Show less"
                    : `View ${sortedComments.length - 3} more comments`}
                </button>
              )}
            </div>
          )}

          {session && (
            <div className="px-2 sm:px-4 py-4 sm:py-6 border-t border-border-light">
              <div className="flex gap-2 sm:gap-3">
                <div className="w-8 h-8 rounded-full bg-bg-secondary flex-shrink-0 overflow-hidden">
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
                      <User size={14} className="text-fg-secondary" />
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
                    className="flex-1 px-3 sm:px-4 py-2 bg-bg-secondary border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all text-sm sm:text-base text-fg-primary placeholder:text-fg-tertiary"
                    disabled={addComment.isPending}
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={addComment.isPending || !commentText.trim()}
                    className="w-9 h-9 sm:w-10 sm:h-10 inline-flex items-center justify-center bg-accent-primary text-white rounded-full hover:bg-accent-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
            <div className="ios-card-elevated p-4 sm:p-6">
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
              className="w-full ios-card p-4 flex items-center gap-3 text-fg-secondary hover:text-accent-primary hover:bg-accent-primary/5 transition-colors group"
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
            <div className="ios-card p-3 sm:p-4">
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
        <div className="space-y-4">
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