import { EventFeed } from "~/components/events/EventFeed";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { EventReminderService } from "~/components/events/EventReminderService";

export default function PublishPage() {
    return (
        <div className="min-h-screen bg-bg-primary">
            <SideNav />

            <div className="lg:ml-16 pt-16 lg:pt-0 kairos-page-enter">
                <header className="sticky top-16 lg:top-0 z-30 topbar-solid border-b border-white/[0.06]">
                    <div className="max-w-[600px] mx-auto px-4 py-3 flex justify-between items-center">
                        <h1 className="text-lg font-bold text-fg-primary tracking-tight">Events</h1>
                        <UserDisplay />
                    </div>
                </header>

                <main id="main-content" className="w-full">
                    <EventReminderService />

                    <div className="max-w-[600px] mx-auto">
                        <EventFeed showCreateForm={true} />
                    </div>
                </main>
            </div>
        </div>
    );
}