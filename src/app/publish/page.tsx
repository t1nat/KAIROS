"use client";

import { useState, useMemo } from "react";
import { EventFeed, REGIONS } from "~/components/events/EventFeed";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { EventReminderService } from "~/components/events/EventReminderService";
import {
    Rss,
    MapPin,
    Calendar,
    TrendingUp,
    ListTodo,
    Heart,
    MessageCircle,
    Users,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { api } from "~/trpc/react";

/* ─── Left Sidebar ─── */
function FeedLeftSidebar({
    selectedRegion,
    onRegionChange,
}: {
    selectedRegion: string;
    onRegionChange: (region: string) => void;
}) {
    return (
        <aside className="sticky top-16 lg:top-0 h-fit space-y-6 py-4">
            {/* Feed link */}
            <div>
                <button
                    onClick={() => onRegionChange("")}
                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-accent-primary/10 text-accent-primary font-semibold text-sm transition-colors"
                >
                    <Rss size={18} />
                    Feed
                </button>
            </div>

            {/* Filter by Towns */}
            <div>
                <h3 className="text-xs font-bold text-fg-tertiary uppercase tracking-wider px-4 mb-3">
                    Filter by Towns
                </h3>
                <div className="space-y-0.5">
                    <button
                        onClick={() => onRegionChange("")}
                        className={`flex items-center gap-2.5 w-full px-4 py-2 rounded-lg text-sm transition-colors ${
                            selectedRegion === ""
                                ? "bg-accent-primary/10 text-accent-primary font-medium"
                                : "text-fg-secondary hover:text-fg-primary hover:bg-white/[0.04]"
                        }`}
                    >
                        <MapPin size={14} />
                        All Regions
                    </button>
                    {REGIONS.filter((r) => r.value !== "").map((region) => (
                        <button
                            key={region.value}
                            onClick={() => onRegionChange(region.value)}
                            className={`flex items-center gap-2.5 w-full px-4 py-2 rounded-lg text-sm transition-colors ${
                                selectedRegion === region.value
                                    ? "bg-accent-primary/10 text-accent-primary font-medium"
                                    : "text-fg-secondary hover:text-fg-primary hover:bg-white/[0.04]"
                            }`}
                        >
                            <MapPin size={14} />
                            {region.label}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
}

/* ─── Right Sidebar ─── */
function FeedRightSidebar() {
    const { data: eventsData } = api.event.getPublicEvents.useQuery();

    /* Compute engagement stats from the events data */
    const engagementStats = useMemo(() => {
        if (!eventsData || eventsData.length === 0) return null;

        const totalLikes = eventsData.reduce((sum, e) => sum + e.likeCount, 0);
        const totalComments = eventsData.reduce((sum, e) => sum + e.commentCount, 0);
        const totalRsvps = eventsData.reduce(
            (sum, e) => sum + e.rsvpCounts.going + e.rsvpCounts.maybe,
            0
        );
        const maxLikes = Math.max(...eventsData.map((e) => e.likeCount), 1);
        const maxComments = Math.max(...eventsData.map((e) => e.commentCount), 1);

        return {
            totalLikes,
            totalComments,
            totalRsvps,
            totalEvents: eventsData.length,
            maxLikes,
            maxComments,
            topEvents: [...eventsData]
                .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
                .slice(0, 3),
        };
    }, [eventsData]);

    return (
        <aside className="sticky top-16 lg:top-0 h-fit space-y-6 py-4">
            {/* Quick Links */}
            <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.06] p-4">
                <h3 className="text-sm font-bold text-fg-primary mb-3">Quick Links</h3>
                <div className="space-y-1">
                    {[
                        { label: "Calendar", href: "/calendar", icon: Calendar },
                        { label: "Progress", href: "/progress", icon: TrendingUp },
                        { label: "Tasks", href: "/create", icon: ListTodo },
                    ].map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-fg-secondary hover:text-fg-primary hover:bg-white/[0.04] transition-colors group"
                        >
                            <div className="flex items-center gap-2.5">
                                <link.icon size={16} className="text-accent-primary" />
                                {link.label}
                            </div>
                            <ChevronRight
                                size={14}
                                className="text-fg-tertiary opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                        </Link>
                    ))}
                </div>
            </div>

            {/* Event Progress / Engagement */}
            <div className="bg-[#0a0a0e] rounded-2xl border border-white/[0.06] p-4">
                <h3 className="text-sm font-bold text-fg-primary mb-4">Event Progress</h3>

                {!engagementStats ? (
                    <p className="text-xs text-fg-tertiary">No event data yet.</p>
                ) : (
                    <div className="space-y-4">
                        {/* Summary stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Heart size={12} className="text-red-400" />
                                    <span className="text-lg font-bold text-fg-primary">
                                        {engagementStats.totalLikes}
                                    </span>
                                </div>
                                <span className="text-[10px] text-fg-tertiary uppercase tracking-wider">
                                    Total Likes
                                </span>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <MessageCircle size={12} className="text-blue-400" />
                                    <span className="text-lg font-bold text-fg-primary">
                                        {engagementStats.totalComments}
                                    </span>
                                </div>
                                <span className="text-[10px] text-fg-tertiary uppercase tracking-wider">
                                    Comments
                                </span>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Users size={12} className="text-green-400" />
                                    <span className="text-lg font-bold text-fg-primary">
                                        {engagementStats.totalRsvps}
                                    </span>
                                </div>
                                <span className="text-[10px] text-fg-tertiary uppercase tracking-wider">
                                    RSVPs
                                </span>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5 mb-1">
                                    <Rss size={12} className="text-accent-primary" />
                                    <span className="text-lg font-bold text-fg-primary">
                                        {engagementStats.totalEvents}
                                    </span>
                                </div>
                                <span className="text-[10px] text-fg-tertiary uppercase tracking-wider">
                                    Events
                                </span>
                            </div>
                        </div>

                        {/* Top events by engagement */}
                        {engagementStats.topEvents.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-fg-tertiary uppercase tracking-wider mb-3">
                                    Top Engagement
                                </h4>
                                <div className="space-y-3">
                                    {engagementStats.topEvents.map((event) => {
                                        const likePct =
                                            (event.likeCount / engagementStats.maxLikes) * 100;
                                        const commentPct =
                                            (event.commentCount / engagementStats.maxComments) * 100;
                                        return (
                                            <div key={event.id} className="space-y-1.5">
                                                <p className="text-xs font-medium text-fg-primary truncate">
                                                    {event.title}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <Heart size={10} className="text-red-400 flex-shrink-0" />
                                                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-red-400/60 rounded-full transition-all duration-500"
                                                            style={{ width: `${likePct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-fg-tertiary w-5 text-right">
                                                        {event.likeCount}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MessageCircle
                                                        size={10}
                                                        className="text-blue-400 flex-shrink-0"
                                                    />
                                                    <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-400/60 rounded-full transition-all duration-500"
                                                            style={{ width: `${commentPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-fg-tertiary w-5 text-right">
                                                        {event.commentCount}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}

/* ─── Main Page ─── */
export default function PublishPage() {
    const [selectedRegion, setSelectedRegion] = useState("");

    return (
        <div className="min-h-screen bg-bg-primary">
            <SideNav />

            <div className="lg:ml-16 pt-16 lg:pt-0 kairos-page-enter">
                <header className="sticky top-16 lg:top-0 z-30 topbar-solid border-b border-white/[0.06]">
                    <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
                        <h1 className="text-lg font-bold text-fg-primary tracking-tight">Events</h1>
                        <UserDisplay />
                    </div>
                </header>

                <main id="main-content" className="w-full">
                    <EventReminderService />

                    <div className="max-w-7xl mx-auto px-4">
                        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-6">
                            {/* Left Sidebar — hidden on mobile */}
                            <div className="hidden lg:block">
                                <FeedLeftSidebar
                                    selectedRegion={selectedRegion}
                                    onRegionChange={setSelectedRegion}
                                />
                            </div>

                            {/* Center Feed */}
                            <div className="max-w-[600px] w-full mx-auto lg:mx-0">
                                <EventFeed
                                    showCreateForm={true}
                                    externalRegion={selectedRegion}
                                    hideRegionFilter={true}
                                />
                            </div>

                            {/* Right Sidebar — hidden on mobile */}
                            <div className="hidden lg:block">
                                <FeedRightSidebar />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}