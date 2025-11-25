// src/app/settings/page.tsx
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SideNav } from "~/app/_components/sideNav";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SettingsNav } from "~/app/_components/settingsNav";
import { ProfileSettingsClient } from "~/app/_components/profileSettingsClient";
import { AppearanceSettings } from "~/app/_components/appearanceSettings";
import { 
  Bell, 
  Shield, 
  Globe, 
  Key,
  Settings as SettingsIcon
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

  const resolvedParams = await searchParams;
  const sectionParam = resolvedParams.section;
  const activeSection = typeof sectionParam === 'string' ? sectionParam : "profile";

  return (
    <div className="min-h-screen bg-[#181F25]" style={{ fontFamily: 'var(--font-faustina)' }}>
      <SideNav />

      <div className="ml-16 min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-[#181F25]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-[#FBF9F5]">Settings</h1>
                <p className="text-sm text-[#E4DEEA]">
                  Manage your account and preferences
                </p>
              </div>
            </div>
            <UserDisplay />
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
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
              {activeSection === "language" && <LanguageSettings />}
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
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
          <Bell className="text-[#A343EC]" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#FBF9F5]">Notification Settings</h2>
          <p className="text-sm text-[#E4DEEA]">Choose what notifications you receive</p>
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

      <div className="mt-6 pt-6 border-t border-white/10">
        <button
          type="button"
          className="px-8 py-3 bg-[#A343EC] text-white font-semibold rounded-xl hover:bg-[#8B35C7] transition-all"
        >
          Save Notification Settings
        </button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
          <Shield className="text-[#A343EC]" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#FBF9F5]">Security Settings</h2>
          <p className="text-sm text-[#E4DEEA]">Manage your security preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-[#FBF9F5] mb-4 flex items-center gap-2">
            <Key size={18} className="text-[#A343EC]" />
            Password
          </h3>
          <button
            type="button"
            className="px-6 py-2 bg-white/5 text-[#FBF9F5] font-semibold rounded-lg hover:bg-white/10 transition-colors border border-white/10"
          >
            Change Password
          </button>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h3 className="font-semibold text-[#FBF9F5] mb-4">Two-Factor Authentication</h3>
          <p className="text-sm text-[#E4DEEA] mb-4">
            Add an extra layer of security to your account
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-[#A343EC] text-white font-semibold rounded-lg hover:bg-[#8B35C7] transition-all"
          >
            Enable 2FA
          </button>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h3 className="font-semibold text-[#FBF9F5] mb-4">Active Sessions</h3>
          <p className="text-sm text-[#E4DEEA] mb-4">
            Manage devices where you&apos;re currently logged in
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-white/5 text-[#FBF9F5] font-semibold rounded-lg hover:bg-white/10 transition-colors border border-white/10"
          >
            View Sessions
          </button>
        </div>

        <div className="pt-4 border-t border-white/10">
          <div className="p-4 bg-red-500/10 rounded-xl border-2 border-red-500/30">
            <h3 className="font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-sm text-[#E4DEEA] mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button
              type="button"
              className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LanguageSettings() {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#A343EC]/20 rounded-lg flex items-center justify-center">
          <Globe className="text-[#A343EC]" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#FBF9F5]">Language & Region</h2>
          <p className="text-sm text-[#E4DEEA]">Select your preferred language</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Display Language
          </label>
          <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#FBF9F5] focus:border-[#A343EC] focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all">
            <option value="en">English</option>
            <option value="bg">Български (Bulgarian)</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Timezone
          </label>
          <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#FBF9F5] focus:border-[#A343EC] focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all">
            <option value="UTC">UTC</option>
            <option value="Europe/Sofia">Europe/Sofia</option>
            <option value="America/New_York">America/New York</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#E4DEEA] mb-2">
            Date Format
          </label>
          <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[#FBF9F5] focus:border-[#A343EC] focus:outline-none focus:ring-2 focus:ring-[#A343EC] transition-all">
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div className="pt-4 border-t border-white/10">
          <button
            type="submit"
            className="px-8 py-3 bg-[#A343EC] text-white font-semibold rounded-xl hover:bg-[#8B35C7] transition-all"
          >
            Save Preferences
          </button>
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