import "~/styles/globals.css";
import "react-chat-elements/dist/main.css";

import { type Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { TRPCReactProvider } from "~/trpc/react";
import { auth } from "~/server/auth";
import NextAuthSessionProvider from "~/components/providers/SessionProvider";
import { ThemeProvider } from "~/components/providers/ThemeProvider";
import { ToastProvider } from "~/components/providers/ToastProvider";
import { UserPreferencesProvider } from "~/components/providers/UserPreferencesProvider";

export const metadata: Metadata = {
  title: "KAIROS",
  description: "Coordinate events, manage projects, and collaborate with your team",
  icons: [{ rel: "icon", url: "/logo_white.png" }],
};

const sans = Nunito_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["200", "300", "400", "600", "700", "800", "900"],
  variable: "--font-geist-sans",
  display: "swap",
});

const display = Nunito_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg-primary text-fg-primary font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <TRPCReactProvider>
            <NextAuthSessionProvider session={session}>
              <ThemeProvider>
                <ToastProvider>
                  <UserPreferencesProvider>{children}</UserPreferencesProvider>
                </ToastProvider>
              </ThemeProvider>
            </NextAuthSessionProvider>
          </TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}