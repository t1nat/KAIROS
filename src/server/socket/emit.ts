/**
 * Socket.IO emit helpers — safe to import from any tRPC router.
 *
 * Uses `getIOSafe()` so calls are no-ops when Socket.IO hasn't been
 * initialised (e.g. during tests or `next dev --turbo` without custom server).
 */

import { getIOSafe } from "./index";

// -------------------------------------------------------------------------
// Chat events
// -------------------------------------------------------------------------

export interface SocketNewMessage {
  messageId: number;
  conversationId: number;
  senderId: string;
  body: string;
  senderName: string | null;
  senderImage: string | null;
  createdAt: Date;
}

export function emitNewMessage(msg: SocketNewMessage) {
  const io = getIOSafe();
  if (!io) return;
  io.to(`conversation:${msg.conversationId}`).emit("message:new", msg);
}

export function emitConversationUpdated(
  userIds: string[],
  payload: { conversationId: number; lastMessageAt: Date },
) {
  const io = getIOSafe();
  if (!io) return;
  for (const uid of userIds) {
    io.to(`user:${uid}`).emit("conversation:updated", payload);
  }
}

// -------------------------------------------------------------------------
// Notification events
// -------------------------------------------------------------------------

export interface SocketNewNotification {
  id: number | string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}

export function emitNotification(userId: string, notif: SocketNewNotification) {
  const io = getIOSafe();
  if (!io) return;
  io.to(`user:${userId}`).emit("notification:new", notif);
}

// -------------------------------------------------------------------------
// Event feed events (real-time updates without refresh)
// -------------------------------------------------------------------------

export function emitEventDeleted(eventId: number) {
  const io = getIOSafe();
  if (!io) return;
  // Broadcast to all connected clients
  io.emit("event:deleted", { eventId });
}

export function emitEventUpdated(eventId: number) {
  const io = getIOSafe();
  if (!io) return;
  io.emit("event:updated", { eventId });
}

// -------------------------------------------------------------------------
// Agent events
// -------------------------------------------------------------------------

export function emitAgentThinking(
  userId: string,
  payload: { agentId: string; status: "thinking" | "done" | "error" },
) {
  const io = getIOSafe();
  if (!io) return;
  io.to(`user:${userId}`).emit("agent:thinking", payload);
}

export function emitAgentResult(
  userId: string,
  payload: { agentId: string; draftId?: number; summary: string },
) {
  const io = getIOSafe();
  if (!io) return;
  io.to(`user:${userId}`).emit("agent:result", payload);
}
