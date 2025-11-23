// src/app/layout.tsx
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Cinzel } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { auth } from "~/server/auth";
import NextAuthSessionProvider from "./sessionProvider";
import { ThemeProvider } from "./_components/themeProvider";

export const metadata: Metadata = {
  title: "KAIROS",
  description: "Coordinate events, manage projects, and collaborate with your team",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

// Using Cinzel as an elegant serif alternative to Arsenica
const arsenica = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: '--font-arsenica',
  display: 'swap',
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className={`${geist.variable} ${arsenica.variable}`} suppressHydrationWarning>
      <body>
        <TRPCReactProvider>
          <NextAuthSessionProvider session={session}>
             <ThemeProvider>
              {children}
             </ThemeProvider>
          </NextAuthSessionProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}