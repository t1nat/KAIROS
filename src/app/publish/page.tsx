// src/app/publish/page.tsx

import { EventFeed } from "../_components/eventFeed";
import { CreateEventForm } from "../_components/createEventForm";
import { SideNav } from "../_components/sideNav";
import { UserDisplay } from "../_components/userDisplay";

// This page combines event creation and viewing with professional layout
export default function PublishPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            {/* Sidebar Navigation */}
            <SideNav />
            
            {/* Main Content Area */}
            <div className="ml-16">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Events</h1>
                            <p className="text-sm text-slate-600">Create and discover events</p>
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