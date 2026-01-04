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

  useEffect(() => {
    applied.current = false;
    migratedAccent.current = false;
  }, [userId]);

  useEffect(() => {
    const raw = data?.accentColor ?? DEFAULT_ACCENT;
    const accent = normalizeAccent(raw);
    document.documentElement.dataset.accent = accent;

    if (!enabled) return;
    if (migratedAccent.current) return;
    if (raw !== accent) {
      migratedAccent.current = true;
      updateAppearance.mutate({ accentColor: accent });
    }
  }, [data?.accentColor]);

  useEffect(() => {
    if (applied.current) return;
    if (!data?.theme) return;
    applied.current = true;
    setTheme(data.theme);
  }, [data?.theme, setTheme]);

  return children;
}
