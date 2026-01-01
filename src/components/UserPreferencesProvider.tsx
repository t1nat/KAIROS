"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";

const DEFAULT_ACCENT = "indigo";

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  const { data } = api.settings.get.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    const accent = data?.accentColor ?? DEFAULT_ACCENT;
    document.documentElement.dataset.accent = accent;
  }, [data?.accentColor]);

  useEffect(() => {
    if (applied.current) return;
    if (!data?.theme) return;
    applied.current = true;
    setTheme(data.theme);
  }, [data?.theme, setTheme]);

  return children;
}
