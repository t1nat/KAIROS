# KAIROS — Technology Stack & Architecture Analysis

## 1. Tech Stack Overview

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.1.1 |
| **Runtime** | React | 19.2.3 |
| **Language** | TypeScript | 5.8.2 |
| **API Layer** | tRPC | 11.0.0 |
| **Database** | PostgreSQL | (via `postgres` driver 3.4.4) |
| **ORM** | Drizzle ORM | 0.41.0 |
| **Authentication** | NextAuth.js (Auth.js) v5 | 5.0.0-beta.25 |
| **Real-Time** | Socket.IO | 4.8.3 |
| **Styling** | Tailwind CSS v4 | 4.1.17 |
| **Email** | Resend | 6.5.2 |
| **File Uploads** | UploadThing | 7.7.4 |
| **AI/LLM** | OpenAI SDK (HuggingFace-compatible) | 6.17.0 |
| **Internationalization** | next-intl | 4.7.0 |
| **Charting** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **Animation** | Framer Motion + GSAP | 12.36.0 / 3.13.0 |
| **Package Manager** | pnpm | 10.28.2 |
| **Testing** | Vitest + Testing Library | 4.0.18 |
| **Linting** | ESLint v9 + Prettier | 9.23.0 / 3.5.3 |

---

## 2. Authentication System

### Provider: NextAuth.js v5 (Auth.js)

**Configuration file:** `src/server/auth/config.ts`

### How It Works

1. **Session Strategy: JWT** — No server-side sessions stored in DB for active sessions (stateless). The JWT is stored in an HTTP-only cookie.

2. **Auth Providers:**
   - **Google OAuth** — Standard OAuth 2.0 flow with `allowDangerousEmailAccountLinking` (allows a user to sign in with Google even if they previously registered with email/password).
   - **Microsoft Entra ID** — OAuth 2.0 with the common tenant endpoint.
   - **Credentials (Email/Password)** — Custom provider using Argon2id for password hashing. Validates email + password against the `users` table.
   - **Credentials (Account Switch)** — Internal-only provider that allows users to switch between accounts using a signed cookie token (for multi-account support).

3. **Database Adapter:** `@auth/drizzle-adapter` maps NextAuth concepts (users, accounts, sessions, verification tokens) to Drizzle ORM tables.

4. **Auth Flow:**
   ```
   Browser → /api/auth/signin → NextAuth handler
     ├── Google/Microsoft → OAuth redirect → Callback → JWT issued
     └── Credentials → Argon2id verify → JWT issued

   JWT stored in HTTP-only cookie → sent with every request

   Server: auth() function (cached per request) decodes JWT → returns session
   ```

5. **Callbacks:**
   - `signIn`: Ensures the user record exists in DB (upsert pattern). If a Google/Microsoft user signs in for the first time, their DB row is created.
   - `jwt`: Embeds `user.id`, `name`, `email`, `image` into the JWT payload. Supports dynamic updates via NextAuth's `update()` trigger.
   - `session`: Maps JWT fields into the `session.user` object exposed to client components.

6. **Password Hashing:** Argon2id with `memoryCost: 65536, timeCost: 3, parallelism: 4`.

---

## 3. Chat System (WebSockets)

### Architecture: Standalone Socket.IO Server + Redis Pub/Sub

The chat system uses a **decoupled architecture** where the WebSocket server runs as a separate process from the Next.js application server.

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Next.js :3000  │────▶│  Redis       │◀────│  WS Server :3001│
│  (tRPC APIs)    │     │  (pub/sub)   │     │  (Socket.IO)    │
└─────────────────┘     └──────────────┘     └─────────────────┘
        ▲                                            ▲
        │                                            │
        │              ┌──────────────┐              │
        └──────────────│  Browser     │──────────────┘
                       │  (Client)    │
                       └──────────────┘
```

### How It Works — Step by Step

#### Connection Establishment:
1. **Token request**: Client calls `GET /api/ws/token` (Next.js API route, requires NextAuth session).
2. **Token signing**: Server generates an HMAC-SHA256 ticket containing `{userId, sessionId, iat, exp}` with 120s TTL using `WS_SECRET`.
3. **Socket.IO connect**: Client passes the ticket in Socket.IO's `auth` field when connecting to `ws://localhost:3001`.
4. **Ticket verification**: WS server verifies the HMAC signature and expiry with constant-time comparison.
5. **Auto-join**: On successful auth, user auto-joins their personal room `user:{userId}`.

#### Room System:
| Room Pattern | Purpose | Auth Check |
|-------------|---------|------------|
| `user:{userId}` | Personal inbox (notifications, call events) | Auto-joined on connect |
| `org:{organizationId}` | Organization-wide broadcasts | Verified against `organization_members` table |
| `project:{projectId}` | Project-scoped events | Verified against project owner/collaborator/org membership |
| `conversation:{conversationId}` | Chat message delivery | Lightweight (tRPC layer enforces access) |

#### Message Flow:
1. User types a message in `ChatClient.tsx`.
2. **Optimistic update**: Message immediately appears in the UI via React Query cache mutation.
3. `api.chat.sendMessage.mutate()` → tRPC procedure:
   a. Insert message into `direct_messages` table.
   b. Update `direct_conversations.lastMessageAt`.
   c. Call `emitNewMessage()` → publishes to Redis channel `ws:conversation:{id}`.
   d. Call `emitConversationUpdated()` → publishes to each user's `ws:user:{id}` channel.
   e. Create notification in DB → `emitNotification()` to receiver's user room.
4. **WS Server** picks up the Redis publication and fans out to all Socket.IO clients in the room.
5. **Client** receives `message:new` event → React Query cache is invalidated → UI updates.

#### Token Refresh:
- Client refreshes the WS token every 90s (before the 120s expiry).
- `useWsToken` hook manages this via React Query's `staleTime: 90_000`.

#### Dev Fallback:
- If Redis is not available, the publisher falls back to HTTP POST to `ws-server/internal/emit` (protected by `WS_SECRET`).

### Database Schema (Chat):
- **`direct_conversations`**: `id`, `projectId?`, `organizationId?`, `userOneId`, `userTwoId`, `lastMessageAt`.
- **`direct_messages`**: `id`, `conversationId`, `senderId`, `body` (text), `createdAt`.
- De-duplication via `normalizePair(a, b)` — always stores `userOneId < userTwoId`.

---

## 4. Database & ORM

### Drizzle ORM + PostgreSQL

**Configuration:** `config/drizzle.config.ts`
**Schema files:** `src/server/db/schemas/` (modular — separate files per domain)

#### Schema Modules:
| File | Tables |
|------|--------|
| `users.ts` | `users`, `accounts`, `sessions`, `verificationTokens`, `passwordResetCodes` |
| `projects.ts` | `projects`, `projectCollaborators` |
| `tasks.ts` | `tasks`, `taskComments`, `taskActivityLog` |
| `notes.ts` | `notebooks`, `stickyNotes`, `noteShares` |
| `chat.ts` | `directConversations`, `directMessages` |
| `events.ts` | Events-related tables |
| `notifications.ts` | Notification tables |
| `organizations.ts` | `organizations`, `organizationMembers`, `customRoles` |
| `enums.ts` | All PostgreSQL enums (`share_status`, `task_status`, `task_priority`, etc.) |

#### How Drizzle Works:
- **Schema-as-code**: Tables are defined as TypeScript objects using Drizzle's builder API (`pgTable`, `varchar`, `integer`, etc.).
- **Type inference**: `typeof table.$inferSelect` and `.$inferInsert` generate TypeScript types from the schema automatically.
- **Query builder**: Two modes:
  - **Relational queries**: `db.query.users.findFirst({ where: ..., with: { ... } })` — nested joins.
  - **SQL-like builder**: `db.select().from(table).where(...)` — explicit SQL construction.
- **Migrations**: `drizzle-kit generate` creates SQL migration files from schema diffs. `drizzle-kit push` applies them.

---

## 5. API Layer (tRPC)

### How tRPC Works in KAIROS

tRPC provides end-to-end type safety between the server and client without code generation.

```
Client (React) ──api.chat.sendMessage.mutate()──▶ tRPC HTTP handler ──▶ chat.ts router ──▶ DB
    ▲                                                                                      │
    └──────────────────────── type-safe response ◀─────────────────────────────────────────┘
```

#### Setup:
- **Server**: `src/server/api/trpc.ts` — Creates the tRPC context (DB, session) and defines `publicProcedure` (no auth) and `protectedProcedure` (requires NextAuth session).
- **Root router**: `src/server/api/root.ts` — Merges all sub-routers (`chat`, `project`, `note`, `settings`, `auth`, `agent`, `organization`, `event`, `task`, `notification`, `user`).
- **Client**: `src/trpc/react.tsx` — Creates the React Query-based tRPC client. Uses `superjson` for serialization (preserves `Date`, `Map`, etc.).
- **Server-side**: `src/trpc/server.ts` — Server-side tRPC caller for use in Server Components.

#### Data Fetching:
- **Queries**: `api.project.getMyProjects.useQuery()` → React Query hook with caching, stale time, refetch.
- **Mutations**: `api.chat.sendMessage.useMutation()` → with `onMutate` (optimistic update), `onError` (rollback), `onSuccess` (invalidate).
- **Infinite queries**: `api.chat.listMessages.useInfiniteQuery()` → cursor-based pagination.

---

## 6. Email System (Resend)

### How It Works

**Service file:** `src/server/email.ts`

1. **Resend SDK**: Wraps the Resend HTTP API for transactional email delivery.
2. **Configuration**: Reads `RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`, `RESEND_FROM_EMAIL` from environment.
3. **Templates**: Three inline HTML email templates (no separate template engine):
   - **Welcome Email** — Sent on credentials-based signup (fire-and-forget).
   - **Password Reset Code** — 8-digit code with 15-minute expiry.
   - **Note Password Reset** — Link-based reset for encrypted note passwords.
4. **HTML construction**: Email-safe HTML using `<table>` layouts with inline styles for maximum client compatibility.
5. **Singleton pattern**: `getEmailService()` caches the `EmailService` instance to avoid re-creating the Resend client on every call.

### Email Flow (Signup):
```
User submits signup form → api.auth.signup mutation
  → Insert user into DB (argon2id hash)
  → Fire-and-forget: sendWelcomeEmail({ email, userName })
    → EmailService.sendWelcomeEmail()
      → resend.emails.send({ from, to, subject, html, text })
```

### Email Flow (Password Reset):
```
User requests reset → api.auth.requestPasswordReset
  → Generate 8-digit code, store in password_reset_codes table (15min TTL)
  → sendPasswordResetCode({ email, userName, code })
  → User enters code → api.auth.verifyResetCode
  → User enters new password → api.auth.resetPassword
    → Argon2id hash → update users.password → mark code as used
```

---

## 7. File Upload System (UploadThing)

**Configuration:** `src/app/api/uploadthing/core.ts`

- **Profile images**: Up to 1 image, 4MB max. Authenticated via NextAuth session.
- **Chat attachments**: Up to 5 images (4MB each) + 3 PDFs (16MB each).
- **How it works**: UploadThing provides a hosted file storage service. Files are uploaded directly from the browser to UploadThing's CDN. The server-side middleware validates the user session and file constraints. URLs are returned and stored in message bodies or user profiles.

---

## 8. Internationalization (next-intl)

**Configuration:** `src/i18n/` directory with locale JSON files.

- Supports: English (`en`), Bulgarian (`bg`), Spanish (`es`), French (`fr`), German (`de`).
- **Server Components**: `getTranslations("namespace")` → returns `t()` function.
- **Client Components**: `useTranslations("namespace")` hook.
- User's language preference is stored in `users.language` column and synced via `settings.updateLanguageRegion`.

---

## 9. Theming & Appearance

- **Theme engine**: `next-themes` with CSS variables strategy.
- **Themes**: Light, Dark, System.
- **Accent colors**: purple, pink, caramel, mint, sky, strawberry — applied via `data-accent` attribute on `<html>`.
- **Provider**: `UserPreferencesProvider` fetches user settings on mount and applies theme + accent color to the DOM.

---

## 10. AI Agent System

### Architecture: Multi-Agent Orchestration

```
User message → A1 Orchestrator Agent
  ├── Direct response (general questions)
  ├── Handoff → A3 Notes Agent (create/edit notes)
  ├── Handoff → A4 Events Agent (create/manage events)
  └── Handoff → A2 Task Planner Agent (create/manage tasks)
```

- **LLM Backend**: OpenAI-compatible API (configurable via `LLM_BASE_URL`, `LLM_API_KEY`). Can point to OpenAI, HuggingFace Inference API, local models, etc.
- **Context Packing**: `A2ContextPack` aggregates user's projects, tasks, and organization context into the LLM prompt.
- **Draft-Confirm-Apply Pattern**: Sub-agents return a draft (preview) → user confirms → agent applies changes to the database. This prevents accidental data modifications.
- **Rate Limiting**: Daily AI message limits per user (enforced client-side with server validation).

---

## 11. Security Features

| Feature | Implementation |
|---------|---------------|
| Password hashing | Argon2id (memoryCost: 64KB, timeCost: 3, parallelism: 4) |
| Note encryption | AES-256-GCM with user-derived key (from password + salt) |
| WS authentication | HMAC-SHA256 tickets (120s TTL, constant-time verification) |
| CSRF protection | NextAuth built-in CSRF tokens |
| Input validation | Zod schemas on every tRPC procedure |
| SQL injection | Drizzle ORM parameterized queries (no raw SQL) |
| Rate limiting | PIN-based reset lockout (5 attempts, 15min cooldown) |
| Email enumeration | Password reset always returns success regardless of email existence |

---

## 12. Development & Build Pipeline

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Next.js dev server via custom `server.ts` (tsx watch) |
| `pnpm ws:dev` | Start standalone WebSocket server (tsx watch) |
| `pnpm db:generate` | Generate Drizzle migration SQL from schema changes |
| `pnpm db:push` | Push schema changes directly to DB (dev shortcut) |
| `pnpm db:migrate` | Run migration files against DB |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |
| `pnpm build` | Production Next.js build |
| `pnpm start` | Production server start |
| `pnpm test` | Run Vitest test suite |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript type checking |

---

## 13. Project Structure

```
KAIROS/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── chat/               # Chat page + AI chat sub-route
│   │   ├── create/             # Project/note creation + task timeline
│   │   ├── events/             # Events feed
│   │   ├── notes/              # Notes vault
│   │   ├── projects/           # Project analytics dashboard
│   │   ├── settings/           # User settings
│   │   ├── progress/           # Progress tracking
│   │   └── api/                # API routes (auth, uploadthing, ws/token)
│   ├── components/             # React components organized by domain
│   │   ├── auth/               # SignInModal, OnboardingGate
│   │   ├── chat/               # ChatClient, AIChatPageClient, overlays
│   │   ├── events/             # EventFeed, CreateEventForm
│   │   ├── layout/             # SideNav, UserDisplay, GlobalAIWidget
│   │   ├── notes/              # NotesDashboard, NotesList
│   │   ├── notifications/      # NotificationSystem
│   │   ├── projects/           # ProjectsListClient, ProjectChat, AI components
│   │   ├── progress/           # TaskTimelineClient, MilestoneTimeline
│   │   ├── providers/          # SocketProvider, UserPreferencesProvider, ToastProvider
│   │   └── settings/           # Settings sub-pages
│   ├── server/
│   │   ├── api/routers/        # tRPC routers (chat, project, note, auth, etc.)
│   │   ├── auth/               # NextAuth configuration
│   │   ├── db/schemas/         # Drizzle ORM table definitions
│   │   ├── agents/             # AI agent orchestration
│   │   ├── llm/                # LLM client, prompts, schemas
│   │   ├── socket/             # Socket.IO emit helpers
│   │   ├── redis/              # Redis publisher
│   │   └── email.ts            # Resend email service
│   ├── lib/                    # Shared utilities and hooks
│   ├── trpc/                   # tRPC client setup (react + server)
│   └── i18n/                   # Internationalization locale files
├── ws-server/                  # Standalone Socket.IO WebSocket server
├── config/                     # Drizzle, ESLint, and other configs
├── public/                     # Static assets
└── docs/                       # Documentation
```
