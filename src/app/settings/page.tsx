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
  Palette,
  Key,
  Database,
  Mail
} from "lucide-react";

const GRADIENT_BG = "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-950 dark:to-indigo-950";

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
    <div className={`min-h-screen ${GRADIENT_BG}`}>
      <SideNav />

      <div className="ml-16">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Manage your account and preferences
              </p>
            </div>
            <UserDisplay />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-6">
            <aside className="w-64 flex-shrink-0">
              <SettingsNav activeSection={activeSection} />
            </aside>

            <div className="flex-1">
              {activeSection === "profile" && <ProfileSettingsClient user={session.user} />}
              {activeSection === "account" && <AccountSettings user={session.user} />}
              {activeSection === "notifications" && <NotificationSettings />}
              {activeSection === "security" && <SecuritySettings />}
              {activeSection === "language" && <LanguageSettings />}
              {/* 🔥 USE THE IMPORTED COMPONENT */}
              {activeSection === "appearance" && <AppearanceSettings />}
              {activeSection === "privacy" && <PrivacySettings />}
              {activeSection === "data" && <DataSettings />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  id?: string;
  createdAt?: Date | string | null;
}

interface UserProps {
  user: User;
}

function AccountSettings({ user }: UserProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Mail className="text-blue-600 dark:text-blue-400" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Manage your account details</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Account Status</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">Active</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Member Since</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {user.createdAt 
              ? new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              : 'N/A'
            }
          </p>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800">
          <h3 className="font-semibold text-red-900 dark:text-red-400 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
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
  );
}

function NotificationSettings() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
          <Bell className="text-yellow-600 dark:text-yellow-400" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Notification Settings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Choose what notifications you receive</p>
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
          description="Receive reminders about upcoming events"
          defaultChecked={false}
        />
        <NotificationToggle
          title="Marketing Emails"
          description="Receive news and promotional content"
          defaultChecked={false}
        />
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
          <Shield className="text-green-600 dark:text-green-400" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Security Settings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Manage your security preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Key size={18} className="text-slate-600 dark:text-slate-400" />
            Password
          </h3>
          <button
            type="button"
            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Change Password
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Two-Factor Authentication</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Add an extra layer of security to your account
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Enable 2FA
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Active Sessions</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Manage devices where you&apos;re currently logged in
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            View Sessions
          </button>
        </div>
      </div>
    </div>
  );
}

function LanguageSettings() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
          <Globe className="text-purple-600 dark:text-purple-400" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Language & Region</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Select your preferred language</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Display Language
          </label>
          <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:outline-none transition-colors">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            type="submit"
            className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔥 REMOVED LOCAL AppearanceSettings - using imported one instead!

function PrivacySettings() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
          <Shield className="text-indigo-600 dark:text-indigo-400" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy Settings</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Control your privacy preferences</p>
        </div>
      </div>

      <div className="space-y-4">
        <NotificationToggle
          title="Profile Visibility"
          description="Make your profile visible to other users"
          defaultChecked={true}
        />
        <NotificationToggle
          title="Show Online Status"
          description="Let others see when you're online"
          defaultChecked={true}
        />
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
          <Database className="text-cyan-600 dark:text-cyan-400" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Data Management</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">Export or delete your data</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Export Your Data</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Download a copy of all your data
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Request Export
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
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      <label className="relative inline-block w-12 h-6 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="w-12 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
      </label>
    </div>
  );
}