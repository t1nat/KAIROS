"use client";

import { useCallback } from "react";
import { format as fnsFormat } from "date-fns";
import { api } from "~/trpc/react";

type DateFormatPreference = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";

const FORMAT_MAP: Record<DateFormatPreference, string> = {
  "MM/DD/YYYY": "MM/dd/yyyy",
  "DD/MM/YYYY": "dd/MM/yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

const SHORT_FORMAT_MAP: Record<DateFormatPreference, string> = {
  "MM/DD/YYYY": "MMM d",
  "DD/MM/YYYY": "d MMM",
  "YYYY-MM-DD": "MMM d",
};

const LONG_FORMAT_MAP: Record<DateFormatPreference, string> = {
  "MM/DD/YYYY": "MMMM d, yyyy 'at' hh:mm a",
  "DD/MM/YYYY": "d MMMM yyyy 'at' HH:mm",
  "YYYY-MM-DD": "yyyy-MM-dd HH:mm",
};

const WITH_YEAR_MAP: Record<DateFormatPreference, string> = {
  "MM/DD/YYYY": "MMM d, yyyy",
  "DD/MM/YYYY": "d MMM yyyy",
  "YYYY-MM-DD": "yyyy-MM-dd",
};

export function useDateFormat() {
  const { data: settings } = api.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 10,
  });

  const pref: DateFormatPreference = (settings?.dateFormat as DateFormatPreference) ?? "MM/DD/YYYY";

  const formatDate = useCallback(
    (date: Date | string | number, style: "short" | "long" | "full" | "withYear" = "short") => {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "";
      switch (style) {
        case "short":
          return fnsFormat(d, SHORT_FORMAT_MAP[pref]);
        case "long":
          return fnsFormat(d, LONG_FORMAT_MAP[pref]);
        case "full":
          return fnsFormat(d, FORMAT_MAP[pref]);
        case "withYear":
          return fnsFormat(d, WITH_YEAR_MAP[pref]);
        default:
          return fnsFormat(d, FORMAT_MAP[pref]);
      }
    },
    [pref],
  );

  return { formatDate, dateFormat: pref };
}
