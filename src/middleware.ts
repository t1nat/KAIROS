import { NextResponse, type NextRequest } from "next/server";

/**
 * Centralized Next.js middleware for route protection.
 *
 * IMPORTANT: This runs in the Edge Runtime so it CANNOT import Node.js modules
 * (node:crypto, argon2, etc.). Instead of calling the full `auth()` helper we
 * check for the presence of the NextAuth session-token cookie. The actual
 * session validation still happens server-side in `auth()` / `protectedProcedure`.
 */

// Cookie names NextAuth v5 uses (JWT strategy)
const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

// Routes that do NOT require authentication
const PUBLIC_PATHS = new Set(["/", "/api/auth", "/reset-password"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/api/auth")) return true;
  if (pathname.startsWith("/api/trpc")) return true;
  if (pathname.startsWith("/api/account-switch")) return true;
  if (pathname.startsWith("/api/uploadthing")) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.includes(".")) return true;
  return false;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for session cookie (works for both dev http and prod https)
  const hasSession =
    req.cookies.has(SESSION_COOKIE) || req.cookies.has(SECURE_SESSION_COOKIE);

  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
