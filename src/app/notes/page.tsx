import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { NotificationSystem } from "~/components/notifications/NotificationSystem";
import { WorkspaceIndicator } from "~/components/orgs/WorkspaceIndicator";
import { OnboardingGate } from "~/components/auth/OnboardingGate";
import { NotesDashboard } from "~/components/notes/NotesDashboard";

export default async function NotesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return (
    <OnboardingGate>
      <div className="min-h-screen bg-bg-primary">
        <SideNav />
        <div className="lg:ml-16 min-h-screen flex flex-col">
          <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-md border-b border-white/[0.06]">
            <div className="px-4 sm:px-8 py-3 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 text-fg-tertiary text-xs mb-0.5">
                    <span>Workspace</span>
                    <span className="text-[10px]">›</span>
                    <span className="text-fg-secondary font-medium">Notes</span>
                  </div>
                  <h1 className="text-2xl font-bold text-fg-primary tracking-tight">Notes</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <WorkspaceIndicator compact />
                <div className="hidden sm:block h-6 w-px bg-white/[0.06]" />
                <NotificationSystem />
                <UserDisplay />
              </div>
            </div>
          </header>
          <main className="flex-1">
            <NotesDashboard />
          </main>
        </div>
      </div>
    </OnboardingGate>
  );
}
