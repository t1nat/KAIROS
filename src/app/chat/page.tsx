import { auth } from "~/server/auth";
import { redirect } from "next/navigation";

import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { NotificationSystem } from "~/components/notifications/NotificationSystem";
import { OrgAccessCodeBadge } from "~/components/orgs/OrgAccessCodeBadge";
import { OrgSwitcher } from "~/components/orgs/OrgSwitcher";
import { ChatClient } from "~/components/chat/ChatClient";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <SideNav />

      <div className="lg:ml-16 min-h-screen flex flex-col pt-16 lg:pt-0">
        <header className="sticky top-16 lg:top-0 z-30 topbar-solid border-b border-border-light/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg shadow-accent-primary/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-fg-primary tracking-tight">Chat</h1>
                <p className="text-xs text-fg-tertiary">Connect with your team</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <OrgSwitcher />
              <OrgAccessCodeBadge />
              <NotificationSystem />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full overflow-hidden">
          <ChatClient userId={session.user.id} />
        </main>
      </div>
    </div>
  );
}
