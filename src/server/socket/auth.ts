/**
 * Socket.IO authentication middleware.
 *
 * Parses the NextAuth JWT session cookie from the handshake headers and
 * attaches the authenticated userId to `socket.data.userId`.
 */

import type { Socket, DefaultEventsMap } from "socket.io";
import { decode } from "next-auth/jwt";

/** Cookie names used by NextAuth v5 (authjs). */
const COOKIE_NAMES = [
  "__Secure-authjs.session-token", // production (HTTPS)
  "authjs.session-token",          // development (HTTP)
];

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export async function socketAuthMiddleware(
  socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { userId: string }>,
  next: (err?: Error) => void,
) {
  try {
    const cookieHeader = socket.handshake.headers.cookie;
    const cookies = parseCookies(cookieHeader);

    let token: string | undefined;
    let cookieName: string | undefined;
    for (const name of COOKIE_NAMES) {
      if (cookies[name]) {
        token = cookies[name];
        cookieName = name;
        break;
      }
    }

    if (!token || !cookieName) {
      return next(new Error("Authentication failed — no session cookie"));
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return next(new Error("AUTH_SECRET not configured"));
    }

    // NextAuth v5 uses the cookie name as the salt for JWT encode/decode.
    const decoded = await decode({ token, secret, salt: cookieName });

    const userId =
      (decoded as Record<string, unknown> | null)?.id ??
      (decoded as Record<string, unknown> | null)?.sub;

    if (typeof userId !== "string" || !userId) {
      return next(new Error("Authentication failed — invalid token"));
    }

    socket.data.userId = userId;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
}
