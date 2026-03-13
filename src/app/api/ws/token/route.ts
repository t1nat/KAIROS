/**
 * GET /api/ws/token — Issues a short-lived HMAC ticket for WebSocket auth.
 *
 * Requires an authenticated NextAuth session.  The ticket is verified
 * by the standalone WS server on socket connect.
 */

import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { signWsTicket } from "~/server/ws/sign";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.WS_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: "WebSocket service unavailable — WS_SECRET missing or too short" },
      { status: 503 },
    );
  }

  const { token, expiresAt } = signWsTicket(
    session.user.id,
    session.user.id, // sessionId — use userId as a stand-in since NextAuth v5 JWT doesn't expose sessionId
    secret,
    120, // 120 second TTL
  );

  return NextResponse.json({ token, expiresAt });
}
