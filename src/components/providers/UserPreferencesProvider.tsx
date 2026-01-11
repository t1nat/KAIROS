"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";

const DEFAULT_ACCENT = "purple";

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
      return DEFAULT_ACCENT;
  }
};

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const applied = useRef(false);
  const migratedAccent = useRef(false);

  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const enabled = status === "authenticated";

  const { data } = api.settings.get.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const updateAppearance = api.settings.updateAppearance.useMutation();

  // Apply accent color immediately on mount from data attribute to prevent flash
  useEffect(() => {
    const savedAccent = document.documentElement.dataset.accent;
    if (savedAccent && savedAccent !== "purple") {
      // Accent already set from SSR or previous visit
      return;
    }
  }, []);

  useEffect(() => {
    applied.current = false;
    migratedAccent.current = false;
  }, [userId]);

  useEffect(() => {
    if (!data?.accentColor) return;
    const raw = data.accentColor;
    const accent = normalizeAccent(raw);
    
    // Apply immediately and persist
    document.documentElement.dataset.accent = accent;
    
    // Store in sessionStorage for faster next load
    try {
      sessionStorage.setItem('user-accent', accent);
    } catch {}

    if (!enabled) return;
    if (migratedAccent.current) return;
    if (raw !== accent) {
      migratedAccent.current = true;
      updateAppearance.mutate({ accentColor: accent });
    }
  }, [data?.accentColor, enabled, updateAppearance]);

  useEffect(() => {
    if (applied.current) return;
    if (!data?.theme) return;
    applied.current = true;
    setTheme(data.theme);
  }, [data?.theme, setTheme]);

  return children;
}
