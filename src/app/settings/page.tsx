import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SideNav } from "~/app/_components/SideNav";
import { UserDisplay } from "~/app/_components/UserDisplay";
import { SettingsNav } from "~/app/_components/SettingsNav";
import { ProfileSettingsClient } from "~/app/_components/ProfileSettingsClient";
import { AppearanceSettings } from "~/app/_components/AppearanceSettings";
import { ThemeToggle } from "~/app/_components/ThemeToggle";
import { LanguageSettingsClient } from "~/app/_components/LanguageSettingsClient";
import { getTranslations } from "next-intl/server";
import { 
  Bell, 
  Shield, 
  Key,
} from "lucide-react";

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
              {activeSection === "notifications" && <NotificationSettings />}
              {activeSection === "security" && <SecuritySettings />}
              {activeSection === "language" && <LanguageSettingsClient />}
              {activeSection === "appearance" && <AppearanceSettings />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <Bell className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">Notification Settings</h2>
          <p className="text-sm text-fg-secondary">Choose what notifications you receive</p>
        </div>
      </div>

      <div className="space-y-4">
        <NotificationToggle
          title="Email Notifications"
          description="Receive email updates about your activity"
          defaultChecked={true}
        />
        <NotificationToggle
          title="Project Updates"
          description="Get notified when projects are updated"
          defaultChecked={true}
        />
        <NotificationToggle
          title="Event Reminders"
          description="Receive in-app reminders about upcoming events"
          defaultChecked={true}
        />
        <NotificationToggle
          title="Task Due Reminders"
          description="Get notified when tasks are due"
          defaultChecked={true}
        />
        <NotificationToggle
          title="Marketing Emails"
          description="Receive news and promotional content"
          defaultChecked={false}
        />
      </div>

      <div className="mt-6 pt-6 border-t border-border-light/20">
        <button
          type="button"
          className="px-8 py-3 bg-accent-primary text-white font-semibold rounded-xl hover:bg-accent-hover transition-all"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <Shield className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">Security Settings</h2>
          <p className="text-sm text-fg-secondary">Manage your security preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-fg-primary mb-4 flex items-center gap-2">
            <Key size={18} className="text-accent-primary" />
            Password
          </h3>
          <button
            type="button"
            className="px-6 py-2 bg-bg-surface text-fg-primary font-semibold rounded-lg hover:bg-bg-elevated transition-colors border border-border-light/20"
          >
            Change Password
          </button>
        </div>

        <div className="pt-4 border-t border-border-light/20">
          <h3 className="font-semibold text-fg-primary mb-4">Two-Factor Authentication</h3>
          <p className="text-sm text-fg-secondary mb-4">
            Add an extra layer of security to your account
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-accent-primary text-white font-semibold rounded-lg hover:bg-accent-hover transition-all"
          >
            Enable 2FA
          </button>
        </div>

        <div className="pt-4 border-t border-border-light/20">
          <h3 className="font-semibold text-fg-primary mb-4">Active Sessions</h3>
          <p className="text-sm text-fg-secondary mb-4">
            Manage devices where you&apos;re currently logged in
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-bg-surface text-fg-primary font-semibold rounded-lg hover:bg-bg-elevated transition-colors border border-border-light/20"
          >
            View Sessions
          </button>
        </div>

        <div className="pt-4 border-t border-border-light/20">
          <div className="p-4 bg-error/10 rounded-xl border-2 border-error/30">
            <h3 className="font-semibold text-error mb-2">Danger Zone</h3>
            <p className="text-sm text-fg-secondary mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              type="button"
              className="px-6 py-2 bg-error text-white font-semibold rounded-lg hover:opacity-90 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationToggle({ 
  title, 
  description, 
  defaultChecked 
}: { 
  title: string; 
  description: string; 
  defaultChecked: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="flex-1">
        <h3 className="font-semibold text-[#FBF9F5]">{title}</h3>
        <p className="text-sm text-[#E4DEEA]">{description}</p>
      </div>
      <label className="relative inline-block w-12 h-6 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="w-12 h-6 bg-white/10 rounded-full peer-checked:bg-[#A343EC] transition-colors"></div>
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
      </label>
    </div>
  );
}