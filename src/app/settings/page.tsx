import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { SettingsNav } from "~/components/layout/SettingsNav";
import { ProfileSettingsClient } from "~/components/settings/ProfileSettingsClient";
import { AppearanceSettings } from "~/components/settings/AppearanceSettings";
import { LanguageSettingsClient } from "~/components/settings/LanguageSettingsClient";
import { NotificationSettingsClient } from "~/components/settings/NotificationSettingsClient";
import { SecuritySettingsClient } from "~/components/settings/SecuritySettingsClient";
import { getTranslations } from "next-intl/server";
import { Settings } from "lucide-react";

type SearchParams = Record<string, string | string[] | undefined>;

interface SettingsPageProps {
  searchParams: Promise<SearchParams>;
}

export default async function SettingsPage({ 
  searchParams 
}: SettingsPageProps) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const t = await getTranslations("settings");

  const resolvedParams = await searchParams;
  const sectionParam = resolvedParams.section;
  const activeSection = typeof sectionParam === 'string' ? sectionParam : "profile";

  return (
    <div className="w-full h-screen bg-bg-secondary">
      <SideNav />

      <Link
        href="/settings?section=profile"
        aria-label={t("title")}
        title={t("title")}
        className="fixed bottom-4 left-4 z-40 w-11 h-11 rounded-xl bg-bg-surface/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-fg-secondary hover:text-accent-primary lg:hidden border border-border-light"
      >
        <Settings size={20} />
      </Link>

      <div className="lg:ml-16 h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-xl border-b border-border-light">
          <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-xl bg-bg-tertiary border border-border-light shadow-sm">
                <Settings size={20} className="text-fg-tertiary" />
              </div>
              <div>
                <h1 className="text-[22px] font-[590] leading-[1.1] tracking-[-0.016em] text-fg-primary font-[system-ui,Kairos,sans-serif]">
                  {t("title")}
                </h1>
                <p className="text-[13px] leading-[1.3] tracking-[-0.006em] text-fg-tertiary font-[system-ui,Kairos,sans-serif] mt-[2px]">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserDisplay />
            </div>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          {/* Settings Navigation */}
          <aside className="w-64 bg-transparent border-r border-border-light">
            <div className="h-full py-2">
              <SettingsNav activeSection={activeSection} variant="embedded" />
            </div>
          </aside>

          {/* Content Area */}
          <section className="flex-1 overflow-hidden bg-bg-primary">
            <div className="w-full h-full">
              {/* Settings Content */}
              <div className="h-full">
                {activeSection === "profile" && <ProfileSettingsClient user={session.user} />}
                {activeSection === "notifications" && <NotificationSettingsClient />}
                {activeSection === "security" && <SecuritySettingsClient />}
                {activeSection === "language" && <LanguageSettingsClient />}
                {activeSection === "appearance" && <AppearanceSettings />}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
