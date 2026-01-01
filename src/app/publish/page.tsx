import { EventFeed } from "../_components/EventFeed";
import { CreateEventForm } from "../_components/CreateEventForm";
import { SideNav } from "../_components/SideNav";
import { UserDisplay } from "../_components/UserDisplay";
import { Calendar } from "lucide-react";
import { EventReminderService } from "../_components/EventReminderService";
import { ThemeToggle } from "../_components/ThemeToggle";

export default function PublishPage() {
    return (
        <div className="min-h-screen bg-bg-primary relative">
            <SideNav />
            
            <div className="lg:ml-16 pt-16 lg:pt-0">
               <header className="sticky top-0 z-30 glass-effect border-b border-border-light">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-md">
                                <Calendar className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-fg-primary">Events</h1>
                                <p className="text-sm text-fg-secondary">Create and discover events</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <UserDisplay />
                        </div>
                    </div>
                </header>

                <main id="main-content" className="max-w-7xl mx-auto p-8">
                    <CreateEventForm />
                     <EventReminderService />
                    
                    <EventFeed />
                </main>
            </div>
        </div>
    );
}