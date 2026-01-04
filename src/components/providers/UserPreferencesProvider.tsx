"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";

const DEFAULT_ACCENT = "indigo";

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);

  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const enabled = status === "authenticated";

  const { data } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    applied.current = false;
  }, [userId]);

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
