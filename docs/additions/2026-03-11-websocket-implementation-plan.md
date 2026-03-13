# WebSocket Implementation Plan — Socket.IO for KAIROS

> **Date:** 2026-03-11  
> **Status:** Planning  
> **Scope:** Real-time chats, notifications, agent status, live collaboration

---

## 1. Executive Summary

KAIROS currently relies on **tRPC polling** (2–5 second intervals) for all real-time features: direct messages, notifications, and agent thinking indicators. This works but wastes bandwidth, adds latency, and doesn't scale well. This plan migrates real-time features to **Socket.IO** while keeping tRPC for all CRUD operations, authentication, and initial data loading.

**Key principle:** Socket.IO handles **push events only**. All data mutations and queries stay on tRPC. This is an additive change, not a replacement.

---

## 2. Current Real-Time Architecture (Polling)

| Feature | Current Approach | Poll Interval | Component |
|---------|-----------------|---------------|-----------|
| Direct messages | `chat.listMessages` query | 2s | `ChatClient.tsx` |
| Conversations list | `chat.listAllConversations` query | 5s | `ChatClient.tsx` |
| Notifications | `notification.getAll` query | 5s | `NotificationSystem.tsx` |
| Agent "thinking" | Optimistic UI sentinel | N/A (local) | `ProjectIntelligenceChat.tsx` |
| AI draft/confirm/apply | tRPC mutation → response | N/A | `ProjectIntelligenceChat.tsx` |

**Problems:**
- ~720 requests/user/hour for chat + notifications polling alone
- 2-5 second message delivery latency
- No way for one user action to push updates to another user in real-time
- Agent completion on one tab can't notify other tabs or connected users

---

## 3. Target Architecture

```
┌─────────────┐     tRPC (HTTP)      ┌──────────────────┐
│  Next.js    │ ◄──────────────────► │  tRPC Router     │
│  Client     │                      │  (CRUD, auth)    │
│             │     Socket.IO (WS)   ├──────────────────┤
│             │ ◄──────────────────► │  Socket.IO       │
│             │                      │  Server           │
└─────────────┘                      │  (push events)   │
                                     └──────┬───────────┘
                                            │
                                     ┌──────▼───────────┐
                                     │  PostgreSQL       │
                                     │  + Event Emitter  │
                                     └──────────────────┘
```

**Socket.IO responsibilities:** Push notifications, message delivery, typing indicators, presence, agent status broadcasts.

**tRPC responsibilities:** Authentication, data fetching, mutations, file uploads, agent draft/confirm/apply.

---

## 4. Package Requirements

```bash
pnpm add socket.io socket.io-client
```

No additional dependencies needed. Socket.IO handles:
- WebSocket transport with HTTP long-polling fallback
- Automatic reconnection with exponential backoff
- Room-based event routing (per-conversation, per-user, per-org)
- Binary support (for future file transfer notifications)

---

## 5. Server Implementation

### 5.1 Socket.IO Server Setup

**File:** `src/server/socket/index.ts`

```typescript
import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "node:http";

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;
  
  io = new SocketIOServer(httpServer, {
    path: "/api/socketio",
    cors: { origin: process.env.NEXT_PUBLIC_APP_URL, credentials: true },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.use(authMiddleware);  // Validate NextAuth session cookie
  io.on("connection", handleConnection);

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}
```

### 5.2 Authentication Middleware

**File:** `src/server/socket/auth.ts`

Socket.IO connections are authenticated by parsing the NextAuth session cookie from the handshake headers. The same cookie-based auth used in the proxy layer.

```typescript
// Parse "authjs.session-token" or "__Secure-authjs.session-token" from handshake cookies
// Decode JWT to extract userId, then attach to socket.data.userId
```

### 5.3 Room Strategy

| Room Pattern | Description | Join Trigger |
|-------------|-------------|-------------|
| `user:{userId}` | Private user channel | On connection |
| `conversation:{conversationId}` | Chat room | When user opens a conversation |
| `org:{orgId}` | Organization events | When user is member of org |
| `project:{projectId}` | Project updates | When user opens project page |

### 5.4 Event Catalog

| Event | Direction | Room | Payload | Description |
|-------|-----------|------|---------|-------------|
| `message:new` | Server → Client | `conversation:{id}` | `{ messageId, senderId, text, attachments, createdAt }` | New chat message received |
| `message:typing` | Client → Server → Client | `conversation:{id}` | `{ userId, isTyping }` | Typing indicator |
| `notification:new` | Server → Client | `user:{id}` | `{ id, type, title, message, link }` | New notification pushed |
| `notification:read` | Client → Server | `user:{id}` | `{ notificationId }` | Mark notification read (broadcast to other tabs) |
| `agent:thinking` | Server → Client | `user:{id}` | `{ agentId, status: "thinking" \| "done" \| "error" }` | Agent processing status |
| `agent:result` | Server → Client | `user:{id}` | `{ agentId, draftId, summary }` | Agent draft completed (for multi-tab sync) |
| `conversation:updated` | Server → Client | `user:{id}` | `{ conversationId, lastMessage, unreadCount }` | Conversation list update |
| `presence:online` | Server → Client | `org:{id}` | `{ userId, online: boolean }` | User online/offline status |
| `task:updated` | Server → Client | `project:{id}` | `{ taskId, changes }` | Task status change (from agent or other user) |
| `event:updated` | Server → Client | `org:{id}` | `{ eventId, changes }` | Event RSVP/comment/like change |

---

## 6. Client Implementation

### 6.1 Socket Provider

**File:** `src/components/providers/SocketProvider.tsx`

```typescript
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const s = io({ path: "/api/socketio", withCredentials: true });
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
```

### 6.2 Hook: useSocketEvent

**File:** `src/lib/useSocketEvent.ts`

```typescript
export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [socket, event, handler]);
}
```

---

## 7. Migration Plan (Per Feature)

### 7.1 Direct Messages (`ChatClient.tsx`)

**Before:** `refetchInterval: 2000` on `chat.listMessages`  
**After:**
1. Initial load via tRPC `chat.listMessages` (keep query, remove `refetchInterval`)
2. Join room `conversation:{id}` when selecting a conversation
3. Listen for `message:new` → append to local messages array
4. On send: tRPC `chat.sendMessage` mutation → server emits `message:new` to room
5. Listen for `message:typing` → show typing indicator

**Before:** `refetchInterval: 5000` on `chat.listAllConversations`  
**After:**
1. Initial load via tRPC (keep query, remove `refetchInterval`)
2. Listen for `conversation:updated` on `user:{id}` room → invalidate conversations query

### 7.2 Notifications (`NotificationSystem.tsx`)

**Before:** `refetchInterval: 5000` on `notification.getAll`  
**After:**
1. Initial load via tRPC (keep query, remove `refetchInterval`)
2. Listen for `notification:new` on `user:{id}` room → prepend to local state
3. On mark-as-read: tRPC mutation → emit `notification:read` for cross-tab sync
4. Show toast/badge update immediately on push

### 7.3 Agent Status (`ProjectIntelligenceChat.tsx`)

**Before:** Optimistic "thinking" sentinels with polling for result  
**After:**
1. tRPC mutation starts agent processing (keep as-is)
2. Server emits `agent:thinking` when LLM call begins
3. Server emits `agent:result` with draft summary when complete
4. Multi-tab: other tabs show "Agent finished" notification
5. Cross-device: mobile gets push when desktop completes an agent action

### 7.4 Project Collaboration

**New feature enabled by WebSockets:**
1. `task:updated` events pushed when agent applies task changes
2. `presence:online` shows who's viewing the project
3. Future: collaborative cursors, live task dragging

---

## 8. Server Integration with Next.js Custom Server

Since Next.js App Router doesn't natively expose the HTTP server, we need a lightweight custom server wrapper:

**File:** `server.ts` (project root)

```typescript
import { createServer } from "node:http";
import next from "next";
import { initSocketIO } from "./src/server/socket/index.js";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  initSocketIO(httpServer);

  const port = parseInt(process.env.PORT ?? "3000", 10);
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
```

**Updated scripts in `package.json`:**
```json
{
  "dev": "tsx watch server.ts",
  "start": "node server.ts"
}
```

---

## 9. Emitting Events from tRPC Mutations

When a tRPC mutation creates data that other users need to see, it emits to Socket.IO:

**Example — Chat message:**
```typescript
// In chatRouter.sendMessage mutation:
const message = await ctx.db.insert(directMessages).values({...}).returning();
getIO().to(`conversation:${conversationId}`).emit("message:new", {
  messageId: message.id,
  senderId: ctx.session.user.id,
  text: message.text,
  createdAt: message.createdAt,
});
```

**Example — Notification:**
```typescript
// In notificationRouter.create or inline notification creation:
const notif = await ctx.db.insert(notifications).values({...}).returning();
getIO().to(`user:${targetUserId}`).emit("notification:new", {
  id: notif.id,
  type: notif.type,
  title: notif.title,
  message: notif.message,
  link: notif.link,
});
```

**Example — Agent completion:**
```typescript
// In agentOrchestrator after draft completion:
getIO().to(`user:${userId}`).emit("agent:result", {
  agentId: "task_planner",
  draftId,
  summary: plan.summary,
});
```

---

## 10. Implementation Phases

### Phase 1: Foundation (1-2 days)
- [ ] Install `socket.io` and `socket.io-client`
- [ ] Create `src/server/socket/` directory structure
- [ ] Implement Socket.IO server with auth middleware
- [ ] Create custom `server.ts` wrapper
- [ ] Build `SocketProvider` and `useSocket` hook
- [ ] Add to providers in `app/layout.tsx`

### Phase 2: Chat Migration (1-2 days)
- [ ] Emit `message:new` from `chatRouter.sendMessage`
- [ ] Update `ChatClient.tsx` to join/leave conversation rooms
- [ ] Replace `refetchInterval` with `useSocketEvent` for messages
- [ ] Add typing indicators (`message:typing` emit/listen)
- [ ] Replace `listAllConversations` polling with `conversation:updated`

### Phase 3: Notifications Migration (1 day)
- [ ] Emit `notification:new` from all notification creation points
- [ ] Update `NotificationSystem.tsx` to use socket events
- [ ] Remove `refetchInterval: 5000` from notification query
- [ ] Add cross-tab `notification:read` sync

### Phase 4: Agent Status (1 day)
- [ ] Emit `agent:thinking` / `agent:result` from orchestrator
- [ ] Update `ProjectIntelligenceChat.tsx` to listen for agent events
- [ ] Multi-tab agent completion awareness

### Phase 5: Collaboration Features (Optional, 2-3 days)
- [ ] Online presence indicators
- [ ] Project-scoped task update broadcasts
- [ ] Event activity live feed

---

## 11. Monitoring & Scaling

### Single Instance (Current)
- Socket.IO runs in-process alongside Next.js
- In-memory adapter (default) handles all rooms

### Multi-Instance (Future)
- Add `@socket.io/redis-adapter` for cross-process room broadcasting
- Use Redis pub/sub for event distribution
- Sticky sessions via load balancer or Redis adapter handles it

### Metrics to Track
- Connected sockets count
- Messages/second throughput
- Reconnection rate
- Event delivery latency (client timestamps)

---

## 12. Compatibility Notes

- **Next.js 16.1.1:** Custom server required for Socket.IO. Compatible with `--turbo` in dev mode if using separate HTTP server.
- **Vercel deployment:** Socket.IO requires persistent connections. Use a separate WebSocket server (e.g., on Railway/Fly.io) or Vercel's Edge WebSocket support.
- **React 19:** No conflicts with Socket.IO client.
- **tRPC 11:** Socket.IO is additive, not replacing tRPC. Both coexist.

---

## 13. Security Considerations

- All socket connections authenticated via NextAuth session cookie
- Room joins validated against DB membership (user must be participant of conversation, member of org, collaborator of project)
- Message payloads validated with Zod before broadcast
- Rate limiting on socket events (max 10 messages/second per user)
- No sensitive data in socket payloads (IDs only, client fetches full data via tRPC)
