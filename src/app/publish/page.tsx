import { EventFeed } from "~/components/events/EventFeed";
import { CreateEventForm } from "~/components/events/CreateEventForm";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { EventReminderService } from "~/components/events/EventReminderService";

export default function PublishPage() {
    return (
        <div className="min-h-screen bg-bg-primary relative">
            <SideNav />
            
            <div className="lg:ml-16 pt-16 lg:pt-0">
                <main id="main-content" className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-10">
                    <div className="flex justify-end mb-4">
                        <UserDisplay />
                    </div>

                    <div className="space-y-4">
                        <CreateEventForm />
                        <EventReminderService />
                        <EventFeed />
                    </div>
                </main>
            </div>
        </div>
    );
}