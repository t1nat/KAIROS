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
    <div className="w-full h-screen bg-gray-50/50 dark:bg-[#0a0a0a]">
      <SideNav />

      <Link
        href="/settings?section=profile"
        aria-label={t("title")}
        title={t("title")}
        className="fixed bottom-4 left-4 z-40 w-11 h-11 rounded-xl bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 lg:hidden border border-gray-200/60 dark:border-gray-800/60"
      >
        <Settings size={20} />
      </Link>

      <div className="lg:ml-16 h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="px-4 sm:px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 shadow-sm">
                <Settings size={20} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <h1 className="text-[22px] font-[590] leading-[1.1] tracking-[-0.016em] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif]">
                  {t("title")}
                </h1>
                <p className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mt-[2px]">
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
          <aside className="w-64 bg-transparent border-r border-gray-200/60 dark:border-gray-800/60">
            <div className="h-full py-2">
              <SettingsNav activeSection={activeSection} variant="embedded" />
            </div>
          </aside>

          {/* Content Area */}
          <section className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-[#0a0a0a]">
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
