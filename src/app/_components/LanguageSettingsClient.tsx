"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
] as const;

export function LanguageSettingsClient() {
  const t = useTranslations("settings.language");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === locale) ?? languages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    setIsOpen(false);
    
    startTransition(async () => {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      window.location.reload();
    });
  };

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm rounded-2xl border border-border-light/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-accent-primary/15 rounded-lg flex items-center justify-center">
          <Globe className="text-accent-primary" size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-fg-primary">{t("title")}</h2>
          <p className="text-sm text-fg-secondary">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-fg-secondary mb-2">
            {t("displayLanguage")}
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={isPending}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-bg-surface border border-border-light/20 text-fg-primary hover:border-accent-primary/40 focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{currentLanguage?.flag}</span>
                <span className="font-medium">{currentLanguage?.name}</span>
              </div>
              <ChevronDown 
                className={`text-fg-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                size={16} 
              />
            </button>

            {isOpen && (
              <div className="absolute z-50 w-full mt-1 bg-bg-elevated border border-border-light/20 rounded-lg shadow-2xl overflow-hidden">
                {languages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    onClick={() => handleLanguageChange(language.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                      locale === language.code
                        ? "bg-accent-primary/10 text-fg-primary"
                        : "text-fg-primary hover:bg-bg-secondary/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{language.flag}</span>
                      <span className="font-medium">{language.name}</span>
                    </div>
                    {locale === language.code && (
                      <Check className="text-accent-primary" size={14} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="timezone-select" className="block text-sm font-semibold text-fg-secondary mb-2">
            {t("timezone")}
          </label>
          <select 
            id="timezone-select"
            className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-light/20 text-fg-primary text-sm focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all"
            title={t("timezone")}
          >
            <option value="UTC">UTC</option>
            <option value="Europe/Sofia">Europe/Sofia (Bulgaria)</option>
            <option value="Europe/Madrid">Europe/Madrid (Spain)</option>
            <option value="America/New_York">America/New York</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Asia/Tokyo">Asia/Tokyo</option>
          </select>
        </div>

        <div>
          <label htmlFor="date-format-select" className="block text-sm font-semibold text-fg-secondary mb-2">
            {t("dateFormat")}
          </label>
          <select 
            id="date-format-select"
            className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-light/20 text-fg-primary text-sm focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all"
            title={t("dateFormat")}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        {isPending && (
          <div className="flex items-center gap-2 text-sm text-accent-primary pt-2">
            <div className="w-3 h-3 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
            <span>{t("applying")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
