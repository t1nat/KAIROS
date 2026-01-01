import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SideNav } from "~/app/_components/SideNav";
import { UserDisplay } from "~/app/_components/UserDisplay";
import { SettingsNav } from "~/app/_components/SettingsNav";
import { ProfileSettingsClient } from "~/app/_components/ProfileSettingsClient";
import { AppearanceSettings } from "~/app/_components/AppearanceSettings";
import { ThemeToggle } from "~/app/_components/ThemeToggle";
import { LanguageSettingsClient } from "~/app/_components/LanguageSettingsClient";
import { NotificationSettingsClient } from "~/app/_components/NotificationSettingsClient";
import { SecuritySettingsClient } from "~/app/_components/SecuritySettingsClient";
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
    <div className="min-h-screen bg-bg-primary">
      <SideNav />

      <div className="lg:ml-16 pt-16 lg:pt-0 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 glass-effect border-b border-border-light">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-fg-primary">{t("title")}</h1>
                <p className="text-sm text-fg-secondary">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <UserDisplay />
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
          <div className="flex gap-6 h-full">
            <aside className="w-64 flex-shrink-0">
              <div className="sticky top-24">
                <SettingsNav activeSection={activeSection} />
              </div>
            </aside>

            <div className="flex-1">
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
