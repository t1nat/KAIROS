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
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    <div className="w-full h-full overflow-y-auto bg-gray-50/50 dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="pt-6 pb-4">
          <h1 className="text-[32px] font-[590] leading-[1.1] tracking-[-0.016em] text-gray-900 dark:text-white font-[system-ui,Kairos,sans-serif] mb-2">
            {t("title")}
          </h1>
          <p className="text-[15px] leading-[1.4] tracking-[-0.01em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif]">
            {t("subtitle")}
          </p>
        </div>

        <div className="space-y-4">
          {/* Language Selector Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <Globe size={16} className="text-gray-500 dark:text-gray-400" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        {t("displayLanguage")}
                      </div>
                      <div ref={dropdownRef} className="relative">
                        <button
                          ref={buttonRef}
                          type="button"
                          onClick={() => setIsOpen((v) => !v)}
                          disabled={isBusy}
                          aria-expanded={isOpen}
                          aria-haspopup="listbox"
                          className="flex items-center gap-2 w-full text-left"
                        >
                          <span className="text-base">{currentLanguage.flag}</span>
                          <span className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510]">
                            {currentLanguage.name}
                          </span>
                          <ChevronDown
                            className={`ml-auto text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            size={16}
                          />
                        </button>

                        {isOpen && (
                          <div
                            role="listbox"
                            className="absolute z-50 mt-2 min-w-[180px] w-max bg-white dark:bg-[#1a1a1a] border border-gray-200/60 dark:border-gray-800/60 rounded-xl overflow-hidden shadow-xl"
                          >
                            {languages.map((language, index) => (
                              <div key={language.code} className="relative">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={locale === language.code}
                                  onClick={() => handleLanguageChange(language.code)}
                                  disabled={isBusy}
                                  className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                                    isBusy ? "opacity-50 cursor-not-allowed" : ""
                                  } ${
                                    locale === language.code
                                      ? "bg-blue-500/10 dark:bg-blue-500/20"
                                      : "hover:bg-gray-50/60 dark:hover:bg-gray-900/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-base">{language.flag}</span>
                                    <span className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif]">
                                      {language.name}
                                    </span>
                                  </div>
                                  {locale === language.code && (
                                    <Check className="text-blue-600 dark:text-blue-400" size={18} strokeWidth={2.8} />
                                  )}
                                </button>
                                {index < languages.length - 1 && (
                                  <div className="absolute bottom-0 left-[52px] right-0 h-[0.5px] bg-gray-200/50 dark:bg-gray-800/50" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timezone Selector Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 20 12 20ZM12.5 7V12.25L17 14.92L16.25 16.15L11 13V7H12.5Z" 
                          fill="currentColor" className="text-gray-500 dark:text-gray-400"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        {t("timezone")}
                      </div>
                      <select
                        className="w-full bg-transparent text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        value={timezone}
                        onChange={(e) => {
                          setTimezone(e.target.value);
                          setDirty(true);
                        }}
                        disabled={isBusy}
                      >
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100">
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Date Format Selector Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gray-100/60 dark:bg-gray-800/60 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 4H18V3C18 2.45 17.55 2 17 2C16.45 2 16 2.45 16 3V4H8V3C8 2.45 7.55 2 7 2C6.45 2 6 2.45 6 3V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 19C19 19.55 18.55 20 18 20H6C5.45 20 5 19.55 5 19V9H19V19Z" 
                          fill="currentColor" className="text-gray-500 dark:text-gray-400"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] leading-[1.3] tracking-[-0.006em] text-gray-500 dark:text-gray-400 font-[system-ui,Kairos,sans-serif] mb-[1px]">
                        {t("dateFormat")}
                      </div>
                      <select
                        className="w-full bg-transparent text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif] font-[510] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        value={dateFormat}
                        onChange={(e) => {
                          setDateFormat(e.target.value as DateFormatOption);
                          setDirty(true);
                        }}
                        disabled={isBusy}
                      >
                        {dateFormats.map((df) => (
                          <option key={df.value} value={df.value} className="bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100">
                            {df.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button Card */}
          <div className="mb-3">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => void saveRegion()}
                  disabled={isBusy || !dirty}
                  className={`w-full py-3.5 rounded-lg text-center text-[16px] leading-[1.25] tracking-[-0.01em] font-[510] font-[system-ui,Kairos,sans-serif] transition-all ${
                    isBusy || !dirty
                      ? "bg-gray-100/60 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:active:bg-blue-800"
                  }`}
                >
                  {t("save")}
                </button>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isPending && (
            <div className="mb-3">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60">
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[15px] leading-[1.3] tracking-[-0.012em] text-gray-900 dark:text-gray-100 font-[system-ui,Kairos,sans-serif]">
                      {t("applying")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {updateLanguageRegion.error && (
            <div className="mb-3">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl overflow-hidden">
                <div className="px-4 py-3.5">
                  <p className="text-[15px] leading-[1.3] tracking-[-0.012em] text-red-600 dark:text-red-400 font-[system-ui,Kairos,sans-serif] text-center">
                    {updateLanguageRegion.error.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Spacing */}
          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
}
