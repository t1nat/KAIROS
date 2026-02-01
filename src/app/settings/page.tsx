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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.12),transparent_55%),_radial-gradient(circle_at_bottom,_rgba(236,72,153,0.16),transparent_60%)] bg-bg-primary text-fg-primary">
      <SideNav />

      <Link
        href="/settings?section=profile"
        aria-label={t("title")}
        title={t("title")}
        className="fixed bottom-4 left-4 z-40 w-11 h-11 rounded-xl glass-effect shadow-lg flex items-center justify-center text-fg-primary hover:text-accent-primary lg:hidden"
      >
        <Settings size={20} />
      </Link>

      <div className="lg:ml-16 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <header className="sticky top-16 lg:top-0 z-30 topbar-solid ios-header bg-gradient-to-b from-bg-primary/90 via-bg-primary/80 to-transparent backdrop-blur-xl border-b border-border-light/10">
          <div className="px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block w-9 h-9 rounded-2xl bg-gradient-to-br from-accent-primary/30 via-accent-secondary/20 to-bg-elevated flex items-center justify-center shadow-sm">
                <Settings size={18} className="text-accent-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-fg-primary">{t("title")}</h1>
                <p className="text-xs sm:text-sm text-fg-secondary">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 flex h-screen overflow-hidden">
          {/* Minimalist Navigation Rail */}
          <aside className="w-80 bg-bg-primary/60 border-r border-border-light/[0.01] flex-shrink-0">
            <div className="h-full">
              <SettingsNav activeSection={activeSection} variant="embedded" />
            </div>
          </aside>

          {/* Edge-to-Edge Content Area */}
          <section className="flex-1 bg-bg-primary overflow-y-auto">
            <div className="w-full">
              {/* Page Header - Full Width */}
              <div className="px-12 py-8 border-b border-border-light/[0.01]">
                <h1 className="text-2xl font-semibold text-fg-primary tracking-[-0.02em] mb-2">
                  {activeSection === "profile" && t("profile.title")}
                  {activeSection === "notifications" && t("notifications.title")}
                  {activeSection === "security" && t("security.title")}
                  {activeSection === "language" && t("language.title")}
                  {activeSection === "appearance" && t("appearance.title")}
                </h1>
                <p className="text-base text-fg-secondary">
                  {activeSection === "profile" && t("profile.subtitle")}
                  {activeSection === "notifications" && t("notifications.subtitle")}
                  {activeSection === "security" && t("security.subtitle")}
                  {activeSection === "language" && t("language.subtitle")}
                  {activeSection === "appearance" && t("appearance.subtitle")}
                </p>
              </div>

              {/* Settings Content - Full Width Rows */}
              <div className="w-full">
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
