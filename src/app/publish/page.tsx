import { EventFeed } from "~/components/events/EventFeed";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { EventReminderService } from "~/components/events/EventReminderService";

export default function PublishPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
            <SideNav />
            
            <div className="lg:ml-16 pt-16 lg:pt-0">
                <header className="sticky top-16 lg:top-0 z-30 ios-header">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-fg-primary">Events</h1>
                            <p className="text-sm text-fg-secondary">Discover and share upcoming events</p>
                        </div>
                        <UserDisplay />
                    </div>
                </header>

                <main id="main-content" className="w-full">
                    <EventReminderService />
                    
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                        <EventFeed showCreateForm={true} />
                    </div>
                </main>
            </div>
        </div>
    );
}