
// src/app/publish/page.tsx

import { EventFeed } from "../_components/eventFeed";
import { CreateEventForm } from "../_components/createEventForm";

// This page combines event creation and viewing
export default function PublishPage() {
    return (
        <main className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Events</h1>
                
                {/* Form to create new events */}
                <CreateEventForm />
                
                {/* Feed to view all published events */}
                <EventFeed />
            </div>
        </main>
    );
}