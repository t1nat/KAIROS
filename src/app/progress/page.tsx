import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { NotificationSystem } from "~/components/notifications/NotificationSystem";
import { OrgSwitcher } from "~/components/orgs/OrgSwitcher";
import { ProgressFeedClient } from "~/components/progress/ProgressFeedClient";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const tNav = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-bg-primary">
      <SideNav />

      <div className="lg:ml-16 min-h-screen flex flex-col pt-16 lg:pt-0">
        <header className="sticky top-16 lg:top-0 z-30 topbar-solid ios-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold text-fg-primary tracking-tight">{tNav("progress")}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <OrgSwitcher />
              <NotificationSystem />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full overflow-auto">
          <ProgressFeedClient />
        </main>
      </div>
    </div>
  );
}
