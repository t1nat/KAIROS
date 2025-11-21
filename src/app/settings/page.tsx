// src/app/settings/page.tsx
import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { SideNav } from "~/app/_components/sideNav";
import { UserDisplay } from "~/app/_components/userDisplay";
import { SettingsNav } from "~/app/_components/settingsNav";
import { ProfileSettingsClient } from "~/app/_components/profileSettingsClient";
import { 
  Bell, 
  Shield, 
  Globe, 
  Palette,
  Key,
  Database,
  Mail
} from "lucide-react";

const GRADIENT_BG = "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50";

// ✅ FIXED: Use Record instead of index signature
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
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-600">
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Mail className="text-blue-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Account Settings</h2>
          <p className="text-sm text-slate-600">Manage your account details</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-2">Account Status</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Active</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-2">Member Since</h3>
          <p className="text-sm text-slate-600">
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

        <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-600 mb-4">
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Bell className="text-yellow-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Notification Settings</h2>
          <p className="text-sm text-slate-600">Choose what notifications you receive</p>
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <Shield className="text-green-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Security Settings</h2>
          <p className="text-sm text-slate-600">Manage your security preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Key size={18} className="text-slate-600" />
            Password
          </h3>
          <button
            type="button"
            className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Change Password
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Two-Factor Authentication</h3>
          <p className="text-sm text-slate-600 mb-4">
            Add an extra layer of security to your account
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Enable 2FA
          </button>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Active Sessions</h3>
          <p className="text-sm text-slate-600 mb-4">
            Manage devices where you&apos;re currently logged in
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Globe className="text-purple-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Language & Region</h2>
          <p className="text-sm text-slate-600">Select your preferred language</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Display Language
          </label>
          <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors">
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
            <option value="pt">Português</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="zh">中文</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Time Zone
          </label>
          <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors">
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Date Format
          </label>
          <select className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors">
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-200">
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

function AppearanceSettings() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
          <Palette className="text-pink-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Appearance</h2>
          <p className="text-sm text-slate-600">Customize how your workspace looks</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Theme</h3>
          <div className="grid grid-cols-3 gap-4">
            <ThemeOption name="Light" isActive={true} />
            <ThemeOption name="Dark" isActive={false} />
            <ThemeOption name="System" isActive={false} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">Accent Color</h3>
          <div className="flex gap-3">
            <ColorOption color="bg-indigo-600" isActive={true} />
            <ColorOption color="bg-blue-600" isActive={false} />
            <ColorOption color="bg-purple-600" isActive={false} />
            <ColorOption color="bg-pink-600" isActive={false} />
            <ColorOption color="bg-green-600" isActive={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivacySettings() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Shield className="text-indigo-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Privacy Settings</h2>
          <p className="text-sm text-slate-600">Control your privacy preferences</p>
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
        <NotificationToggle
          title="Activity Tracking"
          description="Allow us to track your activity for analytics"
          defaultChecked={false}
        />
        <NotificationToggle
          title="Data Collection"
          description="Share anonymous usage data to improve the app"
          defaultChecked={false}
        />
      </div>
    </div>
  );
}

function DataSettings() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
          <Database className="text-cyan-600" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Data Management</h2>
          <p className="text-sm text-slate-600">Export or delete your data</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-slate-50 rounded-xl">
          <h3 className="font-semibold text-slate-900 mb-2">Export Your Data</h3>
          <p className="text-sm text-slate-600 mb-4">
            Download a copy of all your data
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Request Export
          </button>
        </div>

        <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Delete All Data</h3>
          <p className="text-sm text-red-600 mb-4">
            Permanently delete all your data. This action cannot be undone.
          </p>
          <button
            type="button"
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete All Data
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
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <div className="flex-1">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      <label className="relative inline-block w-12 h-6 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="w-12 h-6 bg-slate-300 rounded-full peer-checked:bg-indigo-600 transition-colors"></div>
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
      </label>
    </div>
  );
}

function ThemeOption({ name, isActive }: { name: string; isActive: boolean }) {
  return (
    <button
      type="button"
      className={`p-4 rounded-xl border-2 transition-all ${
        isActive 
          ? 'border-indigo-500 bg-indigo-50' 
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-sm font-semibold text-slate-900">{name}</div>
    </button>
  );
}

function ColorOption({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <button
      type="button"
      className={`w-12 h-12 rounded-full ${color} transition-transform ${
        isActive ? 'ring-4 ring-offset-2 ring-indigo-300' : 'hover:scale-110'
      }`}
    />
  );
}