"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ReactNode } from "react";

type ThemeName = "light" | "dark" | "system";

interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Initial theme to use when there is no stored preference on this device.
   * This is typically loaded from the user's persisted settings in the database
   * so the experience is consistent across devices.
   */
  initialTheme?: ThemeName;
}

export function ThemeProvider({ children, initialTheme = "dark" }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      /**
       * Use the account-level theme as the default instead of the OS setting.
       * This prevents a white (light) UI on machines whose system theme is light
       * when the user prefers dark inside Kairos.
       */
      defaultTheme={initialTheme}
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}