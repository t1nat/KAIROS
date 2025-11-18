"use client"; // REQUIRED directive for client component

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import React from "react";

// This component wraps your app and passes the session data down to hooks
export default function NextAuthSessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}