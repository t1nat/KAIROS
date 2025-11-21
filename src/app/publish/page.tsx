// src/app/publish/page.tsx
import { EventFeed } from "../_components/eventFeed";
import { CreateEventForm } from "../_components/createEventForm";
import { SideNav } from "../_components/sideNav";
import { UserDisplay } from "../_components/userDisplay";

export default function PublishPage() {
    return (
        <div className="min-h-screen bg-[rgb(var(--bg-primary))]">
            {/* Sidebar Navigation */}
            <SideNav />
            
            {/* Main Content Area */}
            <div className="ml-16">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-[rgb(var(--bg-primary))]/80 backdrop-blur-md border-b border-[rgb(var(--border-light))]">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-[rgb(var(--text-primary))]">Events</h1>
                            <p className="text-sm text-[rgb(var(--text-secondary))]">Create and discover events</p>
                        </div>
                        <UserDisplay />
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-4xl mx-auto p-8">
                    {/* Form to create new events */}
                    <CreateEventForm />
                    
                    {/* Feed to view all published events */}
                    <EventFeed />
                </main>
            </div>
        </div>
    );
}