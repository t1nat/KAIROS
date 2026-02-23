"use client";

import { useState, useEffect } from "react";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { useTranslations } from "next-intl";

type Translator = (key: string, values?: Record<string, unknown>) => string;

export function AppearanceSettings() {
 const useT = useTranslations as unknown as (namespace: string) => Translator;
 const t = useT("settings");
 const { theme, setTheme, systemTheme } = useTheme();
 const [mounted, setMounted] = useState(false);
 const utils = api.useUtils();

 const { status } = useSession();
 const enabled = status === "authenticated";

 const { data } = api.settings.get.useQuery(undefined, {
 enabled,
 retry: false,
 refetchOnWindowFocus: false,
 refetchOnReconnect: false,
 });

 const updateAppearance = api.settings.updateAppearance.useMutation({
 onSuccess: async () => {
 await utils.settings.get.invalidate();
 },
 });

 useEffect(() => {
 setMounted(true);
 }, []);

 if (!mounted) {
 return (
 <div className="w-full h-full overflow-y-auto bg-bg-primary">
 <div className="w-full">
 <div className="animate-pulse">
 <div className="h-[60px] bg-bg-tertiary rounded-[12px] mx-4 mb-2"></div>
 <div className="h-[60px] bg-bg-tertiary rounded-[12px] mx-4 mb-2"></div>
 <div className="h-[60px] bg-bg-tertiary rounded-[12px] mx-4"></div>
 </div>
 </div>
 </div>
 );
 }

 const currentTheme = theme === 'system' ? systemTheme : theme;

 const normalizeAccent = (accent?: string | null) => {
 switch (accent) {
 case "purple":
 case "pink":
 case "caramel":
 case "mint":
 case "sky":
 case "strawberry":
 return accent;
 case "indigo":
 return "purple";
 case "cyan":
 case "teal":
 case "green":
 return "mint";
 case "blue":
 return "sky";
 default:
 return "purple";
 }
 };

 const currentAccent = normalizeAccent(data?.accentColor);

 const accentOptions = [
 { id: "purple", name: t('appearance.purple'), swatchVar: "--brand-purple" },
 { id: "pink", name: t('appearance.pink'), swatchVar: "--brand-pink" },
 { id: "caramel", name: t('appearance.caramel'), swatchVar: "--brand-caramel" },
 { id: "mint", name: t('appearance.mint'), swatchVar: "--brand-mint" },
 { id: "sky", name: t('appearance.sky'), swatchVar: "--brand-sky" },
 { id: "strawberry", name: t('appearance.strawberry'), swatchVar: "--brand-strawberry" },
 ] as const;

 const isBusy = updateAppearance.isPending;

 const onSelectTheme = async (nextTheme: "light" | "dark" | "system") => {
 setTheme(nextTheme);
 try {
 await updateAppearance.mutateAsync({ theme: nextTheme });
 } catch {
 // Error is handled silently
 }
 };

 const onSelectAccent = async (accent: (typeof accentOptions)[number]["id"]) => {
 document.documentElement.dataset.accent = accent;
 try {
 await updateAppearance.mutateAsync({ accentColor: accent });
 } catch {
 // Error is handled silently
 }
 };

 const themes = [
 {
 id: 'light',
 name: t('appearance.light'),
 icon: Sun,
 },
 {
 id: 'dark',
 name: t('appearance.dark'),
 icon: Moon,
 },
 {
 id: 'system',
 name: t('appearance.system'),
 icon: Monitor,
 }
 ];

 return (
 <div className="w-full h-full overflow-y-auto bg-bg-primary">
 <div className="w-full px-4 sm:px-6">
 {/* Header */}
 <div className="pt-8 pb-6">
 <h1 className="text-[34px] font-[700] leading-[1.1] tracking-[-0.022em] text-fg-primary mb-2">
 {t("appearance.title")}
 </h1>
 <p className="text-[15px] leading-[1.4667] tracking-[-0.01em] text-fg-tertiary">
 {t("appearance.subtitle")}
 </p>
 </div>

 {/* Theme Selection Section */}
 <div className="mb-8">
 <div className="bg-bg-secondary rounded-[10px] overflow-hidden border border-white/[0.06]">
 {themes.map((themeOption, index) => {
 const Icon = themeOption.icon;
 const isActive = theme === themeOption.id;
 
 return (
 <div key={themeOption.id} className="relative">
 <button
 onClick={() => onSelectTheme(themeOption.id as "light" | "dark" | "system")}
 disabled={isBusy}
 className={`w-full flex items-center justify-between pl-[16px] pr-[18px] py-[11px] active:bg-bg-tertiary transition-colors duration-200 ${
 isBusy ? "opacity-50 cursor-not-allowed" : ""
 }`}
 >
 <div className="flex items-center gap-[13px]">
 <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center transition-colors ${
 isActive 
 ? "text-accent-primary/15" 
 : "bg-bg-tertiary"
 }`}>
 <Icon 
 size={18} 
 className={isActive 
 ? "text-accent-primary" 
 : "text-fg-secondary"
 } 
 strokeWidth={isActive ? 2.5 : 2.2}
 />
 </div>
 <span className={`text-[17px] leading-[1.235] tracking-[-0.016em] ${
 isActive 
 ? "text-accent-primary font-[590]" 
 : "text-fg-primary font-[400]"
 } `}>
 {themeOption.name}
 </span>
 </div>
 {isActive && (
 <div className="text-accent-primary">
 <Check 
 size={20} 
 strokeWidth={3}
 />
 </div>
 )}
 </button>
 {index !== themes.length - 1 && (
 <div className="absolute bottom-0 left-[59px] right-0 h-[0.33px] border-t border-white/[0.04]" />
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Accent Color Section */}
 <div className="mb-8">
 <div className="bg-bg-secondary rounded-[10px] overflow-hidden border border-white/[0.06]">
 {accentOptions.map((opt, index) => {
 const isActive = currentAccent === opt.id;
 
 return (
 <div key={opt.id} className="relative">
 <button
 type="button"
 disabled={isBusy}
 onClick={() => onSelectAccent(opt.id)}
 className={`w-full flex items-center justify-between pl-[16px] pr-[18px] py-[11px] active:bg-bg-tertiary transition-colors duration-200 ${
 isBusy ? "opacity-50 cursor-not-allowed" : ""
 }`}
 >
 <div className="flex items-center gap-[13px]">
 <div 
 className="w-[30px] h-[30px] rounded-full border-accent-primary shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
 style={{ backgroundColor: `rgb(var(${opt.swatchVar}))` }}
 aria-hidden
 />
 <span className={`text-[17px] leading-[1.235] tracking-[-0.016em] ${
 isActive 
 ? "text-accent-primary font-[590]" 
 : "text-fg-primary font-[400]"
 } `}>
 {opt.name}
 </span>
 </div>
 {isActive && (
 <div className="text-accent-primary">
 <Check 
 size={20} 
 strokeWidth={3}
 />
 </div>
 )}
 </button>
 {index !== accentOptions.length - 1 && (
 <div className="absolute bottom-0 left-[59px] right-0 h-[0.33px] border-t border-white/[0.04]" />
 )}
 </div>
 );
 })}
 </div>
 </div>

 {/* Current Theme Display */}
 <div className="mb-6">
 <div className="bg-bg-secondary rounded-[10px] overflow-hidden border border-white/[0.06]">
 <div className="pl-[16px] pr-[18px] py-[11px]">
 <div className="flex items-center gap-[13px]">
 <div className="w-[30px] h-[30px] rounded-full bg-bg-tertiary flex items-center justify-center">
 <Palette size={18} className="text-fg-secondary" strokeWidth={2.2} />
 </div>
 <div>
 <div className="text-[13px] leading-[1.3846] tracking-[-0.006em] text-fg-secondary mb-[1px]">
 Current Theme
 </div>
 <div className="text-[15px] leading-[1.4667] tracking-[-0.012em] text-fg-primary font-[590]">
 {theme === 'system' 
 ? `System (${currentTheme === 'dark' ? 'Dark' : 'Light'})` 
 : theme === 'dark' ? 'Dark' : 'Light'}
 </div>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Bottom Spacing */}
 <div className="h-8"></div>
 </div>
 </div>
 );
}