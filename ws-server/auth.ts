/**
 * WS ticket authentication — HMAC-signed short-lived tickets.
 *
 * The Next.js app issues tickets via GET /api/ws/token; the standalone
 * WS server verifies them here.  Tickets travel inside the Socket.IO
 * `auth` frame (not in the URL) so they stay out of access logs.
 *
 * Format: base64url(JSON payload) + '.' + base64url(HMAC-SHA256)
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface WsTicketPayload {
  userId: string;
  sessionId: string;
  iat: number; // issued-at  (epoch seconds)
  exp: number; // expiry     (epoch seconds)
}

// ── helpers ──────────────────────────────────────────────────────────

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function fromBase64url(str: string): Buffer {
  return Buffer.from(str, "base64url");
}

function hmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

// ── verify ───────────────────────────────────────────────────────────

export function verifyWsTicket(
  token: string,
  secret: string,
): WsTicketPayload | null {
  const dotIdx = token.indexOf(".");
  if (dotIdx < 0) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const sigB64 = token.slice(dotIdx + 1);

  // Constant-time signature comparison
  const expected = hmac(payloadB64, secret);
  const actual = fromBase64url(sigB64);
  if (expected.length !== actual.length) return null;
  if (!timingSafeEqual(expected, actual)) return null;

  let payload: WsTicketPayload;
  try {
    const json = fromBase64url(payloadB64).toString("utf-8");
    payload = JSON.parse(json) as WsTicketPayload;
  } catch {
    return null;
  }

  // Check expiry
  if (Date.now() > payload.exp * 1000) return null;

  return payload;
}

// ── sign ─────────────────────────────────────────────────────────────

export function signWsTicket(
  userId: string,
  sessionId: string,
  secret: string,
  ttlSeconds = 120,
): { token: string; expiresAt: number } {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;

  const payload: WsTicketPayload = { userId, sessionId, iat, exp };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), "utf-8"));
  const sig = base64url(hmac(payloadB64, secret));

  return { token: `${payloadB64}.${sig}`, expiresAt: exp };
}
