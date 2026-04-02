"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { A1ChatWidgetOverlay } from "~/components/chat/A1ChatWidgetOverlay";

/**
 * Global AI widget rendered in the root layout.
 * - Only shows for authenticated users.
 * - Hidden on /chat/ai (the full-page AI chat) to avoid duplication.
 * - Renders A1ChatWidgetOverlay in uncontrolled mode (shows FAB).
 */
export function GlobalAIWidget() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) return null;
  if (pathname === "/chat/ai") return null;

  return <A1ChatWidgetOverlay />;
}
