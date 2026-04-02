import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { NotificationSystem } from "~/components/notifications/NotificationSystem";
import { WorkspaceIndicator } from "~/components/orgs/WorkspaceIndicator";
import { auth } from "~/server/auth";

export default async function CrmAccountsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const tNav = await getTranslations("nav");

  return (
    <div className="min-h-screen bg-bg-primary">
      <SideNav />
      <div className="lg:ml-16 min-h-screen flex flex-col pt-16 lg:pt-0 kairos-page-enter">
        <header className="sticky top-16 lg:top-0 z-30 topbar-solid">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-fg-primary tracking-tight">{tNav("crm")}: Accounts</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <Link
                href="/crm"
                className="text-sm text-fg-secondary hover:text-fg-primary underline underline-offset-4"
              >
                Back
              </Link>
              <WorkspaceIndicator compact />
              <div className="hidden sm:block h-6 w-px bg-border-medium mx-1"></div>
              <NotificationSystem />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 w-full overflow-auto">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-6">
            <div className="rounded-xl border border-border-medium bg-bg-secondary p-6">
              <p className="text-sm text-fg-secondary">
                Accounts UI will be wired to tRPC next (list + create/update).
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
