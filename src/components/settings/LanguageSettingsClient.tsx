"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "~/trpc/react";

type Translator = (key: string, values?: Record<string, unknown>) => string;

type LanguageCode = "en" | "bg" | "es" | "fr" | "de";
type DateFormatOption = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "bg", name: "Български", flag: "🇧🇬" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/Sofia", label: "Europe/Sofia (Bulgaria)" },
  { value: "Europe/Madrid", label: "Europe/Madrid (Spain)" },
  { value: "America/New_York", label: "America/New York" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo" },
] as const;

const dateFormats: { value: DateFormatOption; label: string }[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

function isDateFormatOption(value: unknown): value is DateFormatOption {
  return value === "MM/DD/YYYY" || value === "DD/MM/YYYY" || value === "YYYY-MM-DD";
}

export function LanguageSettingsClient() {
  const useT = useTranslations as unknown as (namespace: string) => Translator;
  const t = useT("settings.language");
  const useL = useLocale as unknown as () => LanguageCode;
  const locale = useL();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { status } = useSession();
  const enabled = status === "authenticated";

  const { data, isLoading } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const utils = api.useUtils();

  const updateLanguageRegion = api.settings.updateLanguageRegion.useMutation({
    onSuccess: async () => {
      await utils.settings.get.invalidate();
    },
  });

  const initialTimezone = data?.timezone ?? "UTC";
  const initialDateFormat: DateFormatOption = isDateFormatOption(data?.dateFormat)
    ? data.dateFormat
    : "MM/DD/YYYY";

  const [timezone, setTimezone] = useState(initialTimezone);
  const [dateFormat, setDateFormat] = useState<DateFormatOption>(initialDateFormat);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTimezone(initialTimezone);
    setDateFormat(initialDateFormat);
    setDirty(false);
  }, [initialTimezone, initialDateFormat]);

  const currentLanguage = (languages.find((lang) => lang.code === locale) ?? languages[0])!;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isBusy = isLoading || isPending || updateLanguageRegion.isPending;

  const handleLanguageChange = (newLocale: LanguageCode) => {
    setIsOpen(false);
    startTransition(async () => {
      try {
        await updateLanguageRegion.mutateAsync({ language: newLocale });
      } finally {
        document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
        window.location.reload();
      }
    });
  };

  const saveRegion = async () => {
    await updateLanguageRegion.mutateAsync({
      timezone,
      dateFormat,
    });
    setDirty(false);
  };

  return (
    <div>
      {/* Header */}
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
        {/* Language Selector */}
        <div>
          <label className="block text-sm font-semibold text-fg-secondary mb-2">
            {t("displayLanguage")}
          </label>
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              disabled={isBusy}
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-bg-surface border border-border-light/20 text-fg-primary hover:border-accent-primary/40 focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{currentLanguage.flag}</span>
                <span className="font-medium">{currentLanguage.name}</span>
              </div>
              <ChevronDown
                className={`text-fg-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
                size={16}
              />
            </button>

            {isOpen && (
              <div
                role="listbox"
                className="absolute z-50 mt-2 w-full bg-white dark:bg-[#1a1a1a] border border-border-light/20 rounded-lg overflow-hidden shadow-xl"
              >
                {languages.map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    role="option"
                    aria-selected={locale === language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    disabled={isBusy}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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

        {/* Timezone Selector */}
        <div>
          <label
            htmlFor="timezone-select"
            className="block text-sm font-semibold text-fg-secondary mb-2"
          >
            {t("timezone")}
          </label>
          <select
            id="timezone-select"
            className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-light/20 text-fg-primary text-sm focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setDirty(true);
            }}
            disabled={isBusy}
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Format Selector */}
        <div>
          <label
            htmlFor="date-format-select"
            className="block text-sm font-semibold text-fg-secondary mb-2"
          >
            {t("dateFormat")}
          </label>
          <select
            id="date-format-select"
            className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-light/20 text-fg-primary text-sm focus:border-accent-primary/60 focus:outline-none focus:ring-2 focus:ring-accent-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            value={dateFormat}
            onChange={(e) => {
              setDateFormat(e.target.value as DateFormatOption);
              setDirty(true);
            }}
            disabled={isBusy}
          >
            {dateFormats.map((df) => (
              <option key={df.value} value={df.value}>
                {df.label}
              </option>
            ))}
          </select>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void saveRegion()}
            disabled={isBusy || !dirty}
            className="px-8 py-3 bg-accent-primary text-white font-semibold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("save")}
          </button>
          {updateLanguageRegion.error && (
            <p className="text-sm text-red-500">{updateLanguageRegion.error.message}</p>
          )}
        </div>

        {/* Loading Indicator */}
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-accent-primary pt-2">
            <div className="w-3 h-3 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            <span>{t("applying")}</span>
          </div>
        )}
      </div>
    </div>
  );
}