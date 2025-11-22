// src/app/layout.tsx
import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { auth } from "~/server/auth";
import NextAuthSessionProvider from "./sessionProvider";
import { ThemeProvider } from "./_components/themeProvider";

export const metadata: Metadata = {
  title: "Kairos - Professional Event & Project Management",
  description: "Coordinate events, manage projects, and collaborate with your team",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
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