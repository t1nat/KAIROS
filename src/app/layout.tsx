import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Cinzel, Newsreader, Uncial_Antiqua, Faustina, Space_Grotesk } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { TRPCReactProvider } from "~/trpc/react";
import { auth } from "~/server/auth";
import NextAuthSessionProvider from "./sessionProvider";
import { ThemeProvider } from "./_components/ThemeProvider";

export const metadata: Metadata = {
  title: "KAIROS",
  description: "Coordinate events, manage projects, and collaborate with your team",
  icons: [{ rel: "icon", url: "/logo_purple.png" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const arsenica = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: '--font-arsenica',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: 'swap',
});

const uncialAntiqua = Uncial_Antiqua({
  subsets: ["latin"],
  weight: ["400"],
  variable: '--font-uncial-antiqua',
  display: 'swap',
});

const faustina = Faustina({
  subsets: ["latin"],
  variable: "--font-faustina",
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${geist.variable} ${display.variable} ${arsenica.variable} ${newsreader.variable} ${uncialAntiqua.variable} ${faustina.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg-primary text-fg-primary font-sans antialiased">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <TRPCReactProvider>
            <NextAuthSessionProvider session={session}>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </NextAuthSessionProvider>
          </TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}