/**
 * WS ticket signing — used by the Next.js API route to issue tickets.
 *
 * This is a copy of the signing logic from ws-server/auth.ts, kept in
 * src/ so the Next.js bundler can resolve it via the ~ path alias.
 * The verification logic lives only in ws-server/auth.ts.
 */

import { createHmac } from "node:crypto";

export interface WsTicketPayload {
  userId: string;
  sessionId: string;
  iat: number;
  exp: number;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function hmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

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
