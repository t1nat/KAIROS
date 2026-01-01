import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SideNav } from "~/components/layout/SideNav";
import { UserDisplay } from "~/components/layout/UserDisplay";
import { SettingsNav } from "~/components/layout/SettingsNav";
import { ProfileSettingsClient } from "~/components/settings/ProfileSettingsClient";
import { AppearanceSettings } from "~/components/settings/AppearanceSettings";
import { LanguageSettingsClient } from "~/components/settings/LanguageSettingsClient";
import { NotificationSettingsClient } from "~/components/settings/NotificationSettingsClient";
import { SecuritySettingsClient } from "~/components/settings/SecuritySettingsClient";
import { getTranslations } from "next-intl/server";

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
    <div className="min-h-screen bg-gradient-to-br from-bg-primary via-bg-secondary to-bg-tertiary">
      <SideNav />

      <div className="lg:ml-16 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <header className="sticky top-16 lg:top-0 z-30 glass-effect border-b border-border-light/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-fg-primary">{t("title")}</h1>
                <p className="text-sm text-fg-secondary">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserDisplay user={session.user} />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <aside className="w-full lg:w-64 lg:flex-shrink-0">
              <div className="lg:sticky lg:top-24 bg-bg-secondary/30 backdrop-blur-sm rounded-2xl border border-border-light/10">
                <SettingsNav activeSection={activeSection} variant="embedded" />
              </div>
            </aside>

            <div className="flex-1 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 duration-300">
              {activeSection === "profile" && <ProfileSettingsClient user={session.user} />}
              {activeSection === "notifications" && <NotificationSettingsClient />}
              {activeSection === "security" && <SecuritySettingsClient />}
              {activeSection === "language" && <LanguageSettingsClient />}
              {activeSection === "appearance" && <AppearanceSettings />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
