import { EventFeed } from "../_components/eventFeed";
import { CreateEventForm } from "../_components/createEventForm";
import { SideNav } from "../_components/sideNav";
import { UserDisplay } from "../_components/userDisplay";
import { Calendar } from "lucide-react";
import { EventReminderService } from "../_components/eventReminderService";

export default function PublishPage() {
    return (
        <div className="min-h-screen bg-[#181F25] relative">
            <SideNav />
            
            <div className="ml-16">
               <header className="sticky top-0 z-30 bg-[#181F25]/80 backdrop-blur-xl border-b border-white/5">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#A343EC] rounded-xl flex items-center justify-center">
                                <Calendar className="text-white" size={22} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[#FBF9F5]" style={{ fontFamily: 'Faustina, serif' }}>Events</h1>
                                <p className="text-sm text-[#E4DEEA]" style={{ fontFamily: 'Faustina, serif' }}>Create and discover events</p>
                            </div>
                        </div>
                        <UserDisplay />
                    </div>
                </header>

                <main className="max-w-4xl mx-auto p-8"style={{ fontFamily: 'Faustina, serif' }}>
                    <CreateEventForm />
                     <EventReminderService />
                    
                    <EventFeed />
                </main>
            </div>
        </div>
    );
}