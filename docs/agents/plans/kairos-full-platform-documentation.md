# KAIROS — Full Platform Documentation

> **Version:** 1.0 — February 2026  
> **Purpose:** Comprehensive technical documentation covering every major system, architectural decision, and unique feature of the KAIROS platform.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Technology Stack](#2-technology-stack)
3. [Unified Platform Architecture](#3-unified-platform-architecture)
4. [Database Schema & Data Model](#4-database-schema--data-model)
5. [Authentication & Security](#5-authentication--security)
6. [AI Agent System (Core Differentiator)](#6-ai-agent-system-core-differentiator)
   - 6.1 [Agent Architecture Overview](#61-agent-architecture-overview)
   - 6.2 [LLM Models & Model Routing](#62-llm-models--model-routing)
   - 6.3 [LLM Client — `modelClient.ts`](#63-llm-client--modelclientts)
   - 6.4 [JSON Repair Loop — `jsonRepair.ts`](#64-json-repair-loop--jsonrepairts)
   - 6.5 [Agent Orchestrator — `agentOrchestrator.ts`](#65-agent-orchestrator--agentorchestratorts)
   - 6.6 [A1 — Workspace Concierge Agent](#66-a1--workspace-concierge-agent)
   - 6.7 [A2 — Task Planner Agent](#67-a2--task-planner-agent)
   - 6.8 [A3 — Notes Vault Agent](#68-a3--notes-vault-agent)
   - 6.9 [A4 — Events Publisher Agent (Planned)](#69-a4--events-publisher-agent-planned)
   - 6.10 [A5 — Org Admin Agent (Planned)](#610-a5--org-admin-agent-planned)
   - 6.11 [Draft → Confirm → Apply Lifecycle](#611-draft--confirm--apply-lifecycle)
   - 6.12 [PDF Task Extraction](#612-pdf-task-extraction)
   - 6.13 [Agent tRPC Router — API Surface](#613-agent-trpc-router--api-surface)
7. [Project Management System](#7-project-management-system)
8. [Task Management System](#8-task-management-system)
9. [Progress Tracking & Analytics](#9-progress-tracking--analytics)
10. [Events Publishing & Social Feed](#10-events-publishing--social-feed)
11. [Sticky Notes System](#11-sticky-notes-system)
12. [Direct Messaging & Chat](#12-direct-messaging--chat)
13. [Organization & Team Management](#13-organization--team-management)
14. [Notification System](#14-notification-system)
15. [Internationalization (i18n)](#15-internationalization-i18n)
16. [Theming & Appearance](#16-theming--appearance)
17. [Email Service](#17-email-service)
18. [Homepage & Landing Experience](#18-homepage--landing-experience)
19. [File Structure Reference](#19-file-structure-reference)

---

## 1. Platform Overview

**KAIROS** (Greek: "the opportune moment") is a unified productivity and collaboration platform that consolidates multiple standalone tools — project management, task tracking, progress analytics, event publishing, sticky notes, real-time messaging, team/organization management, and AI-powered assistants — into a single cohesive web application.

### What Makes KAIROS Unique

1. **Unified Platform:** Instead of switching between Trello, Notion, Slack, Eventbrite, and separate AI tools, KAIROS merges all of them into one application with a shared data model, unified authentication, and cross-feature intelligence.

2. **AI Agent Suite:** A multi-agent AI system (5 agents planned, 3 fully implemented) powered by open-source models (Qwen 2.5 7B Instruct + Phi 3.5 Mini Instruct) that can reason about the user's entire workspace — projects, tasks, notes, events, and organizations — and safely perform actions through a human-in-the-loop Draft → Confirm → Apply lifecycle. All three implemented agents (A1 Workspace Concierge, A2 Task Planner, A3 Notes Vault) are **combined into a single unified chat interface** — the user talks to one chatbot, and the system automatically routes to the correct agent based on intent detection and handoff delegation.

3. **Schema-First, JSON-Only AI Outputs:** Every AI agent response is validated against Zod schemas with an automatic repair loop. No free-form text is trusted for data mutations — everything goes through structured validation.

4. **Human-in-the-Loop Safety:** Write operations proposed by AI agents require explicit user confirmation via cryptographically signed tokens with SHA-256 plan hashing and expiration windows.

5. **Password-Protected Notes with AI Awareness:** The sticky notes system supports bcrypt-encrypted content that the AI agents are explicitly trained to never access, ask about, or process without the user first unlocking them in the UI.

6. **Progress Tracking Across All Dimensions:** A comprehensive analytics dashboard with pie charts, bar charts, contributor breakdowns, due-date tracking, and 7-day activity trends — all computed from real project and task data.

7. **Social Event Publishing:** A public event feed with RSVP tracking, comments, likes, region-based filtering via Google Maps (Bulgarian cities), image uploads, and automated reminder scheduling.

8. **Multi-Account Switching:** Secure account switching via HMAC-signed cookies with timing-safe comparison, allowing users to maintain multiple identities.

9. **Full Internationalization:** 5 languages (English, Bulgarian, Spanish, French, German) with locale-aware date formatting, dynamic cookie-based locale switching, and multilingual AI prompts.

10. **PDF Intelligence:** Server-side PDF text extraction (via `pdfjs-dist`) with AI-powered task extraction supporting multilingual documents (EN, BG, ES, DE, FR).

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.1 |
| **Frontend** | React | 19.2.3 |
| **Styling** | Tailwind CSS + custom design tokens | v4 |
| **API** | tRPC (end-to-end type-safe) | v11 |
| **Database** | PostgreSQL via Drizzle ORM | Drizzle 0.41 |
| **Auth** | NextAuth.js v5 (JWT strategy) | 5.0.0-beta.25 |
| **AI/LLM** | HuggingFace Inference Providers (OpenAI-compatible) | — |
| **Validation** | Zod | 3.25 |
| **State** | TanStack React Query (via tRPC) | v5.69 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 |
| **Animations** | GSAP + ScrollTrigger, Motion (Framer Motion) | 3.13 / 12.23 |
| **File Upload** | UploadThing | 7.7.4 |
| **Blob Storage** | Vercel Blob | 0.23 |
| **Email** | Resend | 6.5.2 |
| **PDF** | pdfjs-dist (legacy/no-worker build) | 5.4 |
| **Maps** | @react-google-maps/api | 2.20 |
| **i18n** | next-intl | 4.7 |
| **Package Manager** | pnpm | — |
| **Language** | TypeScript (strict) | — |

### Key Dependencies

- **`openai`** — listed in `package.json` for SDK compatibility, but the actual LLM client uses raw `fetch` against HuggingFace's OpenAI-compatible endpoint.
- **`argon2`** — used for password hashing (signup, reset PIN).
- **`bcrypt` / `bcryptjs`** — used for note password protection.
- **`d3`** — available for advanced data visualizations.
- **`gsap` + `@gsap/react`** — scroll-triggered animations on the homepage.
- **`lucide-react`** — icon library throughout the UI.

---

## 3. Unified Platform Architecture

KAIROS follows a **monolithic Next.js App Router** architecture where the frontend and backend coexist in a single codebase. The backend is a set of tRPC routers that expose type-safe procedures, all sharing a common database connection and authentication context.

### Application Router Composition

All backend logic is composed into a single `appRouter` in `src/server/api/root.ts`:

```
appRouter
├── event        — Event publishing, RSVP, comments, likes, reminders
├── settings     — User preferences (profile, notifications, appearance, security)
├── note         — Sticky notes with password protection  
├── project      — Project CRUD, collaborators, org-scoping
├── task         — Task CRUD, status workflows, activity logging
├── organization — Org creation, membership, access codes, roles
├── user         — Profile management, onboarding, search
├── auth         — Email/password signup
├── notification — In-app notification CRUD
├── chat         — Direct messaging, project-scoped conversations
└── agent        — AI agent endpoints (Draft/Confirm/Apply)
```

### Data Flow

```
Browser (React 19)
  → tRPC Client (TanStack Query)
    → Next.js App Router API Route (/api/trpc)
      → tRPC Context (DB + Session via NextAuth)
        → Router Procedure (publicProcedure / protectedProcedure)
          → Zod Input Validation
            → Business Logic (Drizzle ORM queries)
              → PostgreSQL
```

### Provider Tree (Client-Side)

The root layout (`src/app/layout.tsx`) wraps the app in this provider hierarchy:

1. `NextIntlClientProvider` — i18n messages
2. `TRPCReactProvider` — tRPC client with TanStack Query
3. `NextAuthSessionProvider` — auth session hydration
4. `ThemeProvider` — light/dark/system theme
5. `ToastProvider` — custom toast notification system
6. `UserPreferencesProvider` — auto-applies theme + accent color from DB settings

---

## 4. Database Schema & Data Model

Defined in `src/server/db/schema.ts` (841 lines) using Drizzle ORM with PostgreSQL.

### Enums

| Enum | Values | Usage |
|---|---|---|
| `shareStatusEnum` | `private`, `shared_read`, `shared_write` | Projects & notes visibility |
| `permissionEnum` | `read`, `write` | Collaborator permissions |
| `taskStatusEnum` | `pending`, `in_progress`, `completed`, `blocked` | Task workflow states |
| `taskPriorityEnum` | `low`, `medium`, `high`, `urgent` | Task priority levels |
| `usageModeEnum` | `personal`, `organization` | User workspace mode |
| `orgRoleEnum` | `admin`, `worker`, `mentor` | Organization role types |
| `projectStatusEnum` | `active`, `archived` | Project lifecycle |
| `themeEnum` | `light`, `dark`, `system` | Appearance setting |
| `languageEnum` | `en`, `bg`, `es`, `fr`, `de`, `it`, `pt`, `ru`, `ja`, `zh`, `ko` | 11 supported languages |
| `dateFormatEnum` | `MM/DD/YYYY`, `DD/MM/YYYY`, `YYYY-MM-DD` | Date display preference |
| `notificationTypeEnum` | `event`, `task`, `project`, `system` | Notification categories |
| `rsvpStatusEnum` | `going`, `maybe`, `not_going` | Event RSVP responses |
| `regionEnum` | `Sofia`, `Plovdiv`, `Varna`, `Burgas`, `Ruse`, `Stara Zagora`, `Pleven`, `Sliven`, `Dobrich`, `Shumen` | Bulgarian city regions for events |
| `agentTaskPlannerDraftStatusEnum` | `draft`, `confirmed`, `applied`, `expired` | A2 agent draft lifecycle |
| `agentNotesVaultDraftStatusEnum` | `draft`, `confirmed`, `applied`, `expired` | A3 agent draft lifecycle |

### Core Tables

| Table | Key Columns | Purpose |
|---|---|---|
| **`users`** | `id`, `name`, `email`, `password`, `image`, `bio`, `usageMode`, `activeOrganizationId`, `theme`, `accentColor`, `language`, `timezone`, `dateFormat`, `twoFactorEnabled`, `notesKeepUnlockedUntilClose`, `resetPinHash`, `resetPinHint`, `resetPinAttempts`, `resetPinLastAttempt`, notification toggles, privacy flags | Full user account with all preferences |
| **`organizations`** | `id`, `name`, `accessCode`, `createdById`, `createdAt` | Team workspaces with invite codes |
| **`organizationMembers`** | `organizationId`, `userId`, `role` (`admin`/`worker`/`mentor`), org capabilities (`canCreateProjects`, `canAssignTasks`, `canManageMembers`, `canViewAllProjects`, `canEditOrgSettings`) | Org membership with granular permissions |
| **`projects`** | `id`, `title`, `description`, `imageUrl`, `createdById`, `shareStatus`, `organizationId`, `status`, timestamps | Projects optionally scoped to an organization |
| **`tasks`** | `id`, `projectId`, `title`, `description`, `assignedToId`, `status`, `priority`, `dueDate`, `orderIndex`, `completedAt`, `completedById`, `completionNote`, `clientRequestId` (agent idempotency), timestamps | Tasks with full workflow metadata |
| **`stickyNotes`** | `id`, `createdById`, `content`, `passwordHash`, `passwordSalt`, `shareStatus`, timestamps | Notes with optional bcrypt encryption |
| **`events`** | `id`, `title`, `description`, `eventDate`, `region`, `imageUrl`, `createdById`, `enableRsvp`, `sendReminders`, `reminderSentAt`, timestamps | Public events with social features |
| **`directConversations`** | `id`, `userAId`, `userBId`, `projectId`, `lastMessageAt`, timestamps | DM conversations scoped to projects |
| **`directMessages`** | `id`, `conversationId`, `senderId`, `content`, `imageUrl`, timestamps | Individual chat messages |
| **`notifications`** | `id`, `userId`, `type`, `title`, `message`, `link`, `read`, timestamps | In-app notifications |

### Agent-Specific Tables

| Table | Key Columns | Purpose |
|---|---|---|
| **`agentTaskPlannerDrafts`** | `id`, `userId`, `projectId`, `status`, `planJson`, `planHash`, `confirmationToken`, `createdAt`, `confirmedAt`, `appliedAt`, `expiresAt` | Persisted A2 task plan drafts |
| **`agentTaskPlannerApplies`** | `id`, `draftId`, `userId`, `resultJson`, `appliedAt` | Audit trail for applied A2 plans |
| **`agentNotesVaultDrafts`** | `id`, `userId`, `status`, `planJson`, `planHash`, `confirmationToken`, `createdAt`, `confirmedAt`, `appliedAt`, `expiresAt` | Persisted A3 notes operation drafts |
| **`agentNotesVaultApplies`** | `id`, `draftId`, `userId`, `resultJson`, `appliedAt` | Audit trail for applied A3 operations |

### Supporting Tables

| Table | Purpose |
|---|---|
| `projectCollaborators` | Many-to-many project ↔ user with `permission` (read/write) |
| `taskComments` | Text comments on tasks with author metadata |
| `taskActivityLog` | Append-only audit log for task mutations |
| `eventRsvps` | Per-user RSVP status per event |
| `eventComments` | Text/image comments on events |
| `eventLikes` | Composite PK like records (event + user) |
| `accounts` | NextAuth OAuth provider accounts |
| `sessions` | NextAuth session storage |
| `verificationTokens` | NextAuth email verification tokens |

---

## 5. Authentication & Security

### Authentication Providers

Configured in `src/server/auth/config.ts`:

1. **Google OAuth** — Uses `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Email account linking is explicitly disabled for security.

2. **Credentials ("credentials")** — Standard email/password login. Passwords are verified with **argon2** hashing.

3. **Credentials ("account-switch")** — Multi-account switching. Validates the `userId` against an HMAC-signed `kairos.accounts` cookie. Looks up the user in the database to confirm existence.

### Session Strategy

- **JWT-based** sessions (no server-side session storage).
- JWT callback stores `userId`, `name`, `email`, `image` in the token.
- Supports `useSession().update(...)` to dynamically refresh token fields.

### Multi-Account Switching

Implemented in `src/server/accountSwitch.ts`:

- **Cookie format:** `{base64url_payload}.{hmac_sha256_signature}`
- **Payload structure:** `{ v: 1, accounts: [{ userId, email, name, image, lastUsed }] }`
- **Security guarantees:**
  - HMAC-SHA256 signature using `AUTH_SECRET`
  - `crypto.timingSafeEqual` for signature verification (prevents timing attacks)
  - Graceful degradation — returns empty array on any decode failure

### Password Hashing

- **User passwords:** argon2 (via `argon2` npm package)
- **Note passwords:** bcrypt (via `bcrypt`/`bcryptjs`) with generated salt
- **Reset PINs:** argon2 with 5-attempt lockout

### tRPC Procedure Security

Defined in `src/server/api/trpc.ts`:

- **`publicProcedure`** — No auth required. Has a timing middleware (artificial 100–300ms delay in dev).
- **`protectedProcedure`** — Requires valid session. Automatically creates the user in the DB if they authenticated via OAuth but don't have a DB record yet. All agent endpoints use this.

### Additional Security Measures

- **Note password reset:** 4+ digit PIN hashed with argon2, 5-attempt lockout with timestamp tracking.
- **Agent confirmation tokens:** Base64-encoded JSON containing `userId`, `draftId`, `planHash`, and `expiresAt` — verified server-side before any write operation.
- **Plan hashing:** SHA-256 hash of the serialized plan JSON ensures the confirmed plan matches the applied plan exactly.
- **Idempotency:** Agent-created tasks use a `clientRequestId` field to prevent duplicate creation on retries.

---

## 6. AI Agent System (Core Differentiator)

The AI agent system is the most distinctive feature of KAIROS. It is a multi-agent architecture where specialized AI personas reason about the user's workspace data and safely propose/execute changes through a human-in-the-loop approval flow.

### 6.1 Agent Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (React)                       │
│  ProjectIntelligenceChat / A1ChatWidgetOverlay           │
│  AiTaskPlannerPanel / AiTaskDraftPanel                   │
└────────────────────────┬─────────────────────────────────┘
                         │ tRPC mutations
                         ▼
┌──────────────────────────────────────────────────────────┐
│               agent tRPC Router                          │
│  src/server/api/routers/agent.ts                         │
│  Endpoints: draft, projectChatbot, taskPlannerDraft,     │
│  taskPlannerConfirm, taskPlannerApply, notesVaultDraft,  │
│  notesVaultConfirm, notesVaultApply, generateTaskDrafts, │
│  extractTasksFromPdf                                     │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│            Agent Orchestrator                            │
│  src/server/agents/orchestrator/agentOrchestrator.ts     │
│  Central hub: context building, model routing,           │
│  LLM calls, JSON validation, Draft/Confirm/Apply flows   │
└───────┬───────────┬───────────┬──────────────────────────┘
        │           │           │
        ▼           ▼           ▼
┌───────────┐ ┌───────────┐ ┌───────────┐
│ A1 Profile│ │ A2 Profile│ │ A3 Profile│
│ + Context │ │ + Context │ │ + Context │
│ + Prompts │ │ + Prompts │ │ + Prompts │
│ + Schemas │ │ + Schemas │ │ + Schemas │
│ + Tools   │ │ + Tools   │ │ + Tools   │
└─────┬─────┘ └─────┬─────┘ └─────┬─────┘
      │             │             │
      └──────┬──────┘─────────────┘
             ▼
┌──────────────────────────────────────────────────────────┐
│               LLM Layer                                  │
│  modelClient.ts — raw fetch to HF Inference Providers    │
│  jsonRepair.ts  — parse + Zod validate + repair loop     │
└──────────────────────────────────────────────────────────┘
             │
             ▼
   HuggingFace Inference API
   (OpenAI-compatible endpoint)
   models: Qwen 2.5 7B / Phi 3.5 Mini
```

### Directory Structure

```
src/server/agents/
├── context/
│   ├── a1ContextBuilder.ts    — Workspace Concierge context assembly
│   ├── a2ContextBuilder.ts    — Task Planner context assembly  
│   └── a3ContextBuilder.ts    — Notes Vault context assembly
├── llm/
│   ├── modelClient.ts         — LLM HTTP client (HF Inference)
│   └── jsonRepair.ts          — JSON extraction, parsing, repair loop
├── orchestrator/
│   └── agentOrchestrator.ts   — Central orchestrator (1118 lines)
├── pdf/
│   └── pdfExtractor.ts        — Server-side PDF text extraction
├── profiles/
│   ├── a1WorkspaceConcierge.ts — A1 profile definition
│   └── a2TaskPlanner.ts       — A2 profile definition
├── prompts/
│   ├── a1Prompts.ts           — A1 system prompts (3 variants)
│   ├── a2Prompts.ts           — A2 system prompt
│   └── a3Prompts.ts           — A3 system prompt
├── schemas/
│   ├── a1WorkspaceConciergeSchemas.ts — A1 Zod output schemas
│   ├── a2TaskPlannerSchemas.ts        — A2 Zod output schemas
│   ├── a3NotesVaultSchemas.ts         — A3 Zod output schemas
│   └── taskGenerationSchemas.ts       — Task generation schemas
└── tools/
    └── a1/
        └── readTools.ts       — A1 read-only database tools
```

---

### 6.2 LLM Models & Model Routing

#### Default Model: Qwen 2.5 7B Instruct

- **Model ID:** `Qwen/Qwen2.5-7B-Instruct`
- **License:** Apache 2.0
- **Context window:** 128K tokens
- **Strengths:** Excellent instruction following, strong JSON/structured output generation, long context handling, multilingual support
- **Used for:** All primary agent tasks — planning, task decomposition, workspace Q&A, structured output generation

#### Fallback Model: Microsoft Phi 3.5 Mini Instruct

- **Model ID:** `microsoft/Phi-3.5-mini-instruct`
- **License:** MIT
- **Parameters:** 3.8B
- **Context window:** 128K tokens
- **Strengths:** Lightweight, fast inference, good reasoning for its size, memory/compute efficient
- **Used for:** Summarization, extraction, triage drafts, cheap first-pass operations, rolling project summaries

#### Model Switching Logic

The model routing is deterministic and rule-based:

1. **By task type:**
   - `plan_project`, `decompose_task` → **Qwen** (requires strong structured output)
   - `summarize_project`, `summarize_chat`, `extract_tasks` → **Phi** (lighter workload)

2. **By context size:**
   - `maxContextTokensEstimate > 90,000` → force **Qwen** (better long-context robustness)

3. **By latency budget:**
   - `latencyBudgetMs < 1500` → prefer **Phi** (faster inference)

4. **By JSON repair escalation:**
   - If Phi fails JSON validation after 2 repair attempts → retry once on **Qwen**
   - If Qwen fails (timeout/5xx/invalid JSON after 2 repairs) → fall back to **Phi** for non-writing tasks only

5. **Write safety:**
   - For write flows (task creation, note modification), never use a "weaker" model unless the user explicitly enables it.

#### Environment Variables

```env
LLM_BASE_URL=https://router.huggingface.co/v1
LLM_API_KEY=<HuggingFace token with inference.serverless.write>
LLM_DEFAULT_MODEL=Qwen/Qwen2.5-7B-Instruct
LLM_FALLBACK_MODEL=microsoft/Phi-3.5-mini-instruct
LLM_REASONING_MODEL=deepseek-ai/DeepSeek-R1  # optional
```

---

### 6.3 LLM Client — `modelClient.ts`

**File:** `src/server/agents/llm/modelClient.ts`

The LLM client communicates with HuggingFace Inference Providers via their OpenAI-compatible Chat Completions endpoint using raw `fetch` (no `openai` npm SDK dependency at runtime).

#### Configuration

- **Base URL:** Read from `LLM_BASE_URL` env var (default: `https://router.huggingface.co/v1`)
- **API Key:** Read from `LLM_API_KEY` env var (HuggingFace fine-grained token)
- **Default Model:** Read from `LLM_DEFAULT_MODEL` env var (default: `Qwen/Qwen2.5-7B-Instruct`)

#### Exported Functions

**`chatCompletion(req: ChatRequest): Promise<ChatResponse>`**

- Constructs a POST request to `{baseUrl}/chat/completions`
- Sets `Authorization: Bearer {apiKey}` header
- Default temperature: `0.2` (low for deterministic structured output)
- Default max tokens: `4096`
- Supports `jsonMode` flag → sets `response_format: { type: "json_object" }`
- 60-second timeout via `AbortSignal.timeout(60_000)`
- Returns: `{ content, finishReason, usage: { promptTokens, completionTokens, totalTokens } }`

**`simpleCompletion(systemPrompt, userMessage, opts?): Promise<string>`**

- Convenience wrapper that constructs a `[system, user]` message array and returns the response content string directly.
- Used by the JSON repair loop for repair prompts.

---

### 6.4 JSON Repair Loop — `jsonRepair.ts`

**File:** `src/server/agents/llm/jsonRepair.ts`

This module ensures that LLM outputs conform to the expected Zod schemas, with automatic repair when they don't.

#### Algorithm

1. **Extract JSON** from the raw LLM response:
   - First tries to find a markdown code fence (` ```json ... ``` `)
   - Falls back to finding the first `{` or `[` and matching to the closing bracket via depth tracking
   - Returns the raw string if no JSON structure is found

2. **Parse + Validate:**
   - `JSON.parse()` the extracted string
   - Validate against the provided Zod schema via `schema.parse()`

3. **Repair Loop (up to 2 retries):**
   - If parsing or validation fails, construct a repair prompt:
     ```
     System: "You are a JSON repair assistant. The user will give you an invalid 
     JSON string and the error. Return ONLY the corrected valid JSON — no 
     explanations, no fences, no extra text."
     
     User: "Original:\n{invalid_json}\n\nError:\n{error_message}"
     ```
   - Send to the LLM with `temperature: 0` and `jsonMode: true`
   - Retry parse + validate with the repaired output
   - Maximum 2 repair attempts

4. **Return type:**
   - Success: `{ success: true, data: T, repairCount: number }`
   - Failure: `{ success: false, error: string, repairCount: number }`

---

### 6.5 Agent Orchestrator — `agentOrchestrator.ts`

**File:** `src/server/agents/orchestrator/agentOrchestrator.ts` (1,118 lines)

The orchestrator is the central hub for all agent operations. It is the single module that ties together context building, prompt construction, LLM calls, response validation, and the Draft → Confirm → Apply lifecycle.

#### Exported Methods

| Method | Agent | Description |
|---|---|---|
| `draft()` | A1/A2 | General workspace Q&A or task planning. Selects the appropriate agent profile, builds context, calls LLM, parses response. Falls back to a static workspace summary if LLM fails. |
| `taskPlannerDraft()` | A2 | Builds A2 context, calls LLM with A2 system prompt, validates `TaskPlanDraftSchema`, persists draft to `agentTaskPlannerDrafts`. |
| `taskPlannerConfirm()` | A2 | Validates draft ownership/status, mints a confirmation token, marks draft as "confirmed". |
| `taskPlannerApply()` | A2 | Validates confirmation token + plan hash, applies creates/updates/status changes/deletes to the `tasks` table, records in `agentTaskPlannerApplies`. |
| `notesVaultDraft()` | A3 | Builds A3 context, calls LLM with A3 system prompt, validates `NotesVaultDraftSchema`, enforces locked-note guardrails, persists draft. |
| `notesVaultConfirm()` | A3 | Validates draft ownership/status, mints confirmation token, marks draft as "confirmed". |
| `notesVaultApply()` | A3 | Validates token, applies create/update/delete operations on `stickyNotes`, blocks locked-note edits without unlocked content, records results. |
| `generateTaskDrafts()` | — | AI task generation from project descriptions. Fetches project info + existing tasks + team members, builds specialized prompt, returns draft tasks. |
| `extractTasksFromPdf()` | — | Extracts text from Base64 PDF via `pdfExtractor`, builds PDF extraction prompt, calls LLM, returns extracted tasks. |

#### Helper Functions

| Function | Purpose |
|---|---|
| `createDraftId()` | Generates a random UUID for draft identification |
| `requireUserId(ctx)` | Extracts and validates the user ID from the tRPC context |
| `requireProjectId(scope)` | Validates and returns the project ID from a scope object |
| `stableJson(obj)` | Deterministic JSON serialization for hashing (sorted keys) |
| `computePlanHash(plan)` | SHA-256 hash of the stable JSON representation of a plan |
| `mintConfirmationToken(...)` | Creates a Base64-encoded JSON token with `userId`, `draftId`, `planHash`, and `expiresAt` (10-minute window) |
| `readConfirmationToken(token)` | Decodes and validates a confirmation token, checking expiry |
| `buildFallbackResponse(ctx)` | Generates a static workspace summary when LLM calls fail |

---

### 6.6 A1 — Workspace Concierge Agent

The Workspace Concierge is the **"front door"** — a read-only generalist agent that answers questions about the workspace, provides project analysis, and delegates write operations to specialized agents.

#### Profile — `src/server/agents/profiles/a1WorkspaceConcierge.ts`

```typescript
{
  id: "workspace_concierge",
  name: "Workspace Concierge",
  description: "A read-first front door agent that answers workspace questions, 
    analyzes project descriptions to draft task plans, and produces handoffs 
    for write operations — no side effects without approval.",
  draftToolAllowlist: [
    "getSessionContext", "listOrganizations", "listProjects",
    "getProjectDetail", "listTasks", "getTaskDetail",
    "listNotifications", "listEventsPublic"
  ],
  routingRules: {
    modify_tasks: "task_planner",
    notes_ops: "notes_vault",
    events_ops: "events_publisher",
    membership_ops: "org_admin"
  }
}
```

#### Context Builder — `src/server/agents/context/a1ContextBuilder.ts`

Assembles a token-bounded `A1ContextPack` from the database:

- **Session info:** userId, email, name, activeOrganizationId
- **Projects:** Top 10 projects (id, title, description, status)
- **Tasks:** Up to 20 tasks if a `projectId` is scoped (id, title, status, priority, dueDate)
- **Notifications:** Top 10 notifications (id, type, title, message, read)
- **Project detail:** Full project metadata if scoped
- **Timestamp:** Current ISO datetime

All data is fetched via the A1 read tools (`A1_READ_TOOLS`), which query the database through Drizzle ORM.

#### System Prompt — `src/server/agents/prompts/a1Prompts.ts`

The A1 system prompt (`getA1SystemPrompt()`) defines:

1. **Identity:** "You are the KAIROS Concierge — the primary assistant for the Kairos workspace."

2. **Response principles:**
   - Be specific and data-driven (reference actual project/task names and numbers)
   - Structure answers clearly
   - Be honest when data is insufficient
   - Suggest actionable next steps

3. **Guidance for specific question types:**
   - Progress questions → summarize completion percentages, blocked tasks
   - Risk questions → identify overdue/blocked tasks, resource gaps
   - Deadline questions → analyze due dates vs. current status
   - Planning questions → suggest task breakdowns

4. **Scope guard:** Only answer questions about the KAIROS workspace. Refuse out-of-scope requests politely.

5. **Safety rules:** Never invent data, never fabricate IDs, always use provided context.

6. **Output schema:** Strict JSON with:
   - `intent`: `{ type: "answer" | "handoff" | "draft_plan", scope }`
   - `answer`: Free-text response (when type is "answer")
   - `handoff`: `{ targetAgent, context, userIntent }` (when delegating to A2/A3/A4/A5)
   - `draftPlan`: Proposed read queries and changes (when type is "draft_plan")
   - `citations`: Optional references to data sources

7. **Full context pack** injected as JSON at the end of the prompt.

#### Read Tools — `src/server/agents/tools/a1/readTools.ts`

| Tool | Status | Input | Output |
|---|---|---|---|
| `getSessionContext` | ✅ | none | `{ userId, email, name, image, activeOrganizationId }` |
| `listProjects` | ✅ | `{ limit? }` | Array of projects with metadata |
| `listTasks` | ✅ | `{ projectId, status?, limit? }` | Array of tasks with status/priority |
| `listNotifications` | ✅ | `{ limit? }` | Array of notifications |
| `listOrganizations` | 🔲 Placeholder | — | Returns `[]` |
| `getProjectDetail` | 🔲 Placeholder | — | Returns `null` |
| `getTaskDetail` | 🔲 Placeholder | — | Returns `null` |
| `listEventsPublic` | 🔲 Placeholder | — | Returns `[]` |

Each tool has:
- A `name` identifier
- Zod `inputSchema` and `outputSchema`
- An `execute(ctx, input)` function that runs Drizzle ORM queries

#### Output Schema — `src/server/agents/schemas/a1WorkspaceConciergeSchemas.ts`

```typescript
// Intent: what the agent decided to do
ConciergeIntentSchema = z.object({
  type: z.enum(["answer", "handoff", "draft_plan"]),
  scope: z.object({
    orgId: z.union([z.string(), z.number()]).optional(),
    projectId: z.union([z.string(), z.number()]).optional(),
  }).optional(),
});

// Handoff: delegation to a specialized agent
HandoffPlanSchema = z.object({
  targetAgent: z.enum(["task_planner", "notes_vault", "events_publisher", "org_admin"]),
  context: z.record(z.unknown()),
  userIntent: z.string(),
});

// Full output
A1OutputSchema = z.object({
  intent: ConciergeIntentSchema,
  answer: z.string().optional(),
  handoff: HandoffPlanSchema.optional(),
  draftPlan: ActionPlanDraftSchema.optional(),
  citations: z.array(z.string()).optional(),
});
```

---

### 6.7 A2 — Task Planner Agent

The Task Planner is a **write-capable agent** that generates structured task backlogs from user goals, then safely applies them through the Draft → Confirm → Apply lifecycle.

#### Profile — `src/server/agents/profiles/a2TaskPlanner.ts`

```typescript
{
  id: "task_planner",
  name: "Task Planner",
  description: "A task-domain agent that turns goals into an actionable backlog 
    and safely applies task mutations via Draft → Confirm → Apply.",
  draftToolAllowlist: ["getSessionContext", "getProjectDetail", "listTasks", "getTaskDetail"],
  applyToolAllowlist: ["createTask", "updateTask", "updateTaskStatus", "deleteTask"]
}
```

#### Context Builder — `src/server/agents/context/a2ContextBuilder.ts`

Builds an `A2ContextPack`:

- **Session:** userId, activeOrganizationId
- **Scope:** orgId, projectId
- **Project:** Full project metadata (fetched via direct Drizzle query)
- **Collaborators:** All project collaborators including the owner (deduplicated)
- **Existing tasks:** Up to 50 tasks in the project (ordered by `createdAt` desc)
- **Authorization:** Enforced at context-build time — user must be the project owner or a collaborator
- **Handoff context:** Optional context from A1 delegation

#### System Prompt — `src/server/agents/prompts/a2Prompts.ts`

The A2 system prompt (`getA2SystemPrompt()`) defines:

1. **Identity:** "You are the KAIROS Task Planner agent."
2. **Mode:** DRAFT only — "you produce a plan, you do NOT execute it."
3. **Hard rules:**
   - Strict JSON only — no markdown, no commentary
   - Never invent IDs; use IDs from the provided context
   - Avoid duplicate tasks (check existing backlog)
   - Deletions are dangerous and rare — require strong justification
4. **Planning rubric:**
   - Decompose goals into milestones, then into tasks
   - Each task should have clear acceptance criteria
   - Assign priorities based on dependencies and urgency
   - Propose assignees from the collaborator list when possible
5. **Output schema:** The full `TaskPlanDraft` JSON structure

#### Output Schema — `src/server/agents/schemas/a2TaskPlannerSchemas.ts`

```typescript
TaskPlanDraftSchema = z.object({
  agentId: z.literal("task_planner"),
  scope: z.object({ projectId: z.number() }),
  creates: z.array(z.object({
    title: z.string(),
    description: z.string().nullable(),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    assignedToId: z.string().nullable(),
    acceptanceCriteria: z.string().optional(),
    orderIndex: z.number().optional(),
    dueDate: z.string().nullable().optional(),
    clientRequestId: z.string(),  // Required for idempotency
  })),
  updates: z.array(z.object({
    taskId: z.number(),
    patch: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assignedToId: z.string().optional(),
      dueDate: z.string().nullable().optional(),
    }),
    reason: z.string().optional(),
  })),
  statusChanges: z.array(z.object({
    taskId: z.number(),
    status: z.enum(["pending", "in_progress", "completed", "blocked"]),
    reason: z.string().optional(),
  })),
  deletes: z.array(z.object({
    taskId: z.number(),
    reason: z.string(),
    dangerous: z.boolean(),
  })),
  risks: z.array(z.string()),
  questionsForUser: z.array(z.string()),
  diffPreview: z.string(),
  planHash: z.string().optional(),
});
```

#### Apply Logic (in the Orchestrator)

When `taskPlannerApply()` is called:

1. **Token validation:** Decodes the Base64 confirmation token, checks `userId`, `draftId`, plan hash match, and expiry.
2. **Creates:** For each task in `creates[]`:
   - Checks for idempotency via `clientRequestId` (skips if already exists)
   - Inserts into the `tasks` table with `projectId`, `title`, `description`, `priority`, `assignedToId`, `orderIndex`, `dueDate`
3. **Updates:** For each task in `updates[]`:
   - Applies the `patch` fields to the existing task
4. **Status changes:** For each task in `statusChanges[]`:
   - Updates the task status, with completion metadata if status is `completed`
5. **Deletes:** For each task in `deletes[]`:
   - Deletes the task from the database (only if `dangerous` flag is explicitly true)
6. **Audit:** Records the full results in `agentTaskPlannerApplies`

---

### 6.8 A3 — Notes Vault Agent

The Notes Vault agent manages sticky notes while **strictly respecting KAIROS note-locking semantics**. It is the only agent that deals with potentially encrypted user content.

#### Context Builder — `src/server/agents/context/a3ContextBuilder.ts`

Builds a `NotesVaultContextPack`:

- **userId:** Current authenticated user
- **Notes:** All user's sticky notes with metadata:
  - `id`, `createdAt`, `shareStatus`, `isLocked` flag
  - For unlocked notes: full content is included
  - For locked notes: content is only included if the `handoffContext.unlockedNotes` array provides the unlocked content for specific note IDs
- **Normalization:** The `normalizeHandoff()` function carefully validates the handoff context structure, ensuring `noteId` is a positive integer and `content` is a non-empty string

#### System Prompt — `src/server/agents/prompts/a3Prompts.ts`

The A3 system prompt (`getA3SystemPrompt()`) defines:

1. **Identity:** "You are the KAIROS Notes Vault agent."
2. **Critical safety rules:**
   - **NEVER** ask for, accept, store, or process passwords or PINs
   - Locked notes are treated as a "secret class" — unreadable unless `unlockedContent` is explicitly provided
   - If asked to edit a locked note, respond: "Unlock in the UI first, then re-run."
3. **Available notes:** Lists all notes with metadata (id, createdAt, shareStatus, isLocked)
4. **Output schema:**
   ```json
   {
     "agentId": "notes_vault",
     "operations": [
       { "type": "create", "content": "...", "reason": "..." },
       { "type": "update", "noteId": 1, "nextContent": "...", "requiresUnlocked": true },
       { "type": "delete", "noteId": 2, "reason": "...", "dangerous": true }
     ],
     "blocked": [{ "noteId": 3, "reason": "Note is locked" }],
     "summary": "Human-readable summary of what the plan does"
   }
   ```

#### Output Schema — `src/server/agents/schemas/a3NotesVaultSchemas.ts`

```typescript
// Discriminated union of operations
NotesVaultOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), content: z.string(), reason: z.string().optional() }),
  z.object({ type: z.literal("update"), noteId: z.number(), nextContent: z.string(), 
             reason: z.string().optional(), requiresUnlocked: z.boolean() }),
  z.object({ type: z.literal("delete"), noteId: z.number(), reason: z.string(), 
             dangerous: z.literal(true) }),
]);

NotesVaultDraftSchema = z.object({
  agentId: z.literal("notes_vault"),
  operations: z.array(NotesVaultOperationSchema),
  blocked: z.array(z.object({ noteId: z.number(), reason: z.string() })),
  summary: z.string(),
  planHash: z.string().optional(),
});
```

#### Apply Logic (in the Orchestrator)

When `notesVaultApply()` is called:

1. **Token validation:** Same as A2 — Base64 decode, verify userId, draftId, planHash, expiry.
2. **For each operation:**
   - **Create:** Inserts a new row in `stickyNotes` with the content and `shareStatus: "private"`.
   - **Update:** Checks if the note exists and belongs to the user. If `requiresUnlocked` is true and the note has a `passwordHash`, requires that the unlocked content was provided in the handoff context. Updates the content.
   - **Delete:** Checks ownership and deletes the note.
3. **Blocked notes:** Notes that the agent identified as inaccessible (locked without unlocked content) are tracked in the blocked array.
4. **Audit:** Records results (created/updated/deleted/blocked IDs) in `agentNotesVaultApplies`.

---

### 6.9 A4 — Events Publisher Agent (Planned)

Documented in `docs/agents/4-events-publisher.md`. Not yet implemented in code.

**Planned capabilities:**
- Create events from natural language descriptions (→ structured fields: title, description, date, region, RSVP, reminders)
- Update existing events
- Moderate event comments
- Read tools: `listEventsPublic`, `getEventDetail`
- Write tools: `createEvent`, `updateEvent`, `deleteEvent`, `addEventComment`, `setEventRsvp`, `toggleEventLike`

---

### 6.10 A5 — Org Admin Agent (Planned)

Documented in `docs/agents/5-org-admin.md`. Not yet implemented in code.

**Planned capabilities:**
- Manage organization membership (join by access code, invite, remove members)
- Role and capability changes with least-privilege suggestions
- Project collaboration management (add/remove collaborators, permissions)
- Read tools: `listOrganizations`, `getOrganizationDetail`, `getProjectDetail`, `searchUsersByEmail`
- Write tools: `createOrganization`, `joinByAccessCode`, `inviteMember`, `updateRoleCapabilities`, `addProjectCollaborator`
- **All write operations require mandatory approval** — permission changes have long-tail consequences

---

### 6.11 Draft → Confirm → Apply Lifecycle

This is the safety mechanism that prevents AI agents from making unauthorized changes.

#### Phase 1: Draft

1. User sends a natural language request via the chat UI
2. The orchestrator builds a context pack from the database
3. The appropriate agent profile and system prompt are selected
4. The LLM is called with the context and user message
5. The raw LLM response is extracted, parsed, and validated against the Zod schema
6. If validation fails, the JSON repair loop runs (up to 2 retries)
7. The validated plan is persisted to the draft table (`agentTaskPlannerDrafts` or `agentNotesVaultDrafts`) with status `"draft"`
8. The draft is returned to the UI for user review

#### Phase 2: Confirm

1. User reviews the proposed changes in the UI (task list, note previews, etc.)
2. User clicks "Confirm"
3. The orchestrator validates:
   - The draft exists and belongs to the current user
   - The draft status is `"draft"` (not already confirmed/applied/expired)
4. A **confirmation token** is minted:
   ```json
   {
     "userId": "user_123",
     "draftId": "draft_abc",
     "planHash": "sha256_of_plan_json",
     "expiresAt": "2026-02-17T12:10:00Z"  // 10 minutes from now
   }
   ```
   This is Base64-encoded and returned to the client.
5. The draft status is updated to `"confirmed"`

#### Phase 3: Apply

1. User clicks "Apply" (sends the confirmation token)
2. The orchestrator:
   - Decodes the Base64 confirmation token
   - Verifies `userId` matches the current session
   - Verifies `draftId` matches and the draft is in `"confirmed"` status
   - Recomputes the plan hash and verifies it matches `planHash` (ensures the plan hasn't been tampered with)
   - Checks `expiresAt` hasn't passed
3. The operations are executed within the database
4. Results are recorded in the apply audit table
5. The draft status is updated to `"applied"`

#### Security Properties

- **Immutability:** The plan hash ensures the confirmed plan and the applied plan are identical
- **Authentication:** Every step verifies the session user matches the draft owner
- **Expiration:** Confirmation tokens expire after 10 minutes
- **Idempotency:** Task creates use `clientRequestId` to prevent duplicate creation on retries
- **Audit trail:** Every applied plan is recorded with full results

---

### 6.12 PDF Task Extraction

**File:** `src/server/agents/pdf/pdfExtractor.ts`

KAIROS can extract tasks from uploaded PDF documents through a two-step process:

#### Step 1: PDF Text Extraction

- Uses `pdfjs-dist` (legacy build, no web workers) for server-side extraction
- **Limits:** Max 10 MB file size, max 50 pages, max 30,000 characters
- **Validation:** Checks the `%PDF` magic bytes to verify file format
- **Multilingual:** Supports all languages including CJK, Cyrillic, Arabic via `useSystemFonts: true`
- **Output:** `{ text: string, numPages: number, truncated: boolean }`

#### Step 2: AI Task Extraction

- Uses the specialized `getPdfTaskExtractionPrompt()`:
  - Injects the extracted PDF text inline
  - Includes existing project tasks for deduplication
  - Supports multilingual documents (EN, BG, ES, DE, FR)
  - Instructs the LLM to identify actionable items and convert them to structured tasks
- Output validated against `TaskGenerationOutputSchema`:
  ```typescript
  {
    tasks: [{
      title: string,
      description: string,
      priority: "low" | "medium" | "high" | "urgent",
      orderIndex: number,
      estimatedDueDays: number  // estimated days to complete
    }],
    reasoning: string  // the AI's reasoning for its choices
  }
  ```

---

### 6.13 Agent tRPC Router — API Surface

**File:** `src/server/api/routers/agent.ts` (148 lines)

All endpoints are `protectedProcedure` (require authentication):

| Endpoint | Input | Output | Description |
|---|---|---|---|
| `agent.draft` | `{ agentId, message, scope? }` | `AgentDraftResult` | A1 workspace concierge Q&A |
| `agent.projectChatbot` | `{ projectId?, message }` | `AgentDraftResult` | A1 with optional project scope |
| `agent.taskPlannerDraft` | `{ message, scope?, handoffContext? }` | Draft with plan | A2 draft generation |
| `agent.taskPlannerConfirm` | `{ draftId }` | `{ confirmationToken }` | A2 confirmation token minting |
| `agent.taskPlannerApply` | `{ draftId, confirmationToken }` | Apply results | A2 plan execution |
| `agent.notesVaultDraft` | `{ message, handoffContext? }` | Draft with plan | A3 draft generation |
| `agent.notesVaultConfirm` | `{ draftId }` | `{ confirmationToken }` | A3 confirmation token minting |
| `agent.notesVaultApply` | `{ draftId, confirmationToken, handoffContext? }` | Apply results | A3 plan execution |
| `agent.generateTaskDrafts` | `{ projectId, message? }` | Tasks + reasoning | Description-aware task gen |
| `agent.extractTasksFromPdf` | `{ projectId, pdfBase64, fileName?, message? }` | Tasks + reasoning | PDF task extraction |

---

## 7. Project Management System

**Backend:** `src/server/api/routers/project.ts` (712 lines)  
**Frontend:** `src/components/projects/` (12 components)

### Features

- **Create projects** with title, description, image (via UploadThing), and share status
- **Organization scoping:** Projects are automatically associated with the user's active organization (if they are a member). Personal projects have `organizationId = null`.
- **Collaborators:** Users can be added to projects with `read` or `write` permissions via the `projectCollaborators` table.
- **Status:** `active` or `archived`
- **Project listing:** Fetches all projects with enriched data — creator info, task statistics (count per status, due dates), completion percentages.

### Key Components

| Component | Purpose |
|---|---|
| `ProjectsListClient.tsx` | Project grid with per-project doughnut charts showing task completion |
| `ProjectsListWorkspace.tsx` | Workspace-level project listing with org context |
| `ProjectManagement.tsx` | Full project detail view with task board, collaborator management, AI tools |
| `CreateProjectContainer.tsx` | Project creation form |
| `ProjectChat.tsx` | Project-scoped chat interface |
| `ProjectIntelligenceChat.tsx` | AI-powered project intelligence chat (A1 embedded) |
| `AiTaskPlannerPanel.tsx` | A2 Task Planner interface with Draft/Confirm/Apply flow |
| `AiTaskDraftPanel.tsx` | AI task generation from description or PDF |
| `InteractiveTimeline.tsx` | Visual timeline for task scheduling |
| `CollaboratorItem.tsx` | Individual collaborator card with permission controls |
| `A1ChatFloating.tsx` | Floating AI chat button |

---

## 8. Task Management System

**Backend:** `src/server/api/routers/task.ts` (701 lines)

### Features

- **CRUD operations** with comprehensive permission checks:
  - Project owner
  - Organization owner (admin role)
  - Organization member with `canAssignTasks` capability
  - Project collaborator with `write` permission
- **Status workflow:** `pending` → `in_progress` → `completed` | `blocked`
- **Priority levels:** `low`, `medium`, `high`, `urgent`
- **Assignment:** Tasks can be assigned to any project collaborator or org member
- **Completion tracking:** When a task is marked as `completed`, the system records `completedAt`, `completedById`, and an optional `completionNote`
- **Activity logging:** Every task creation is logged to `taskActivityLog` with the action type and actor
- **Ordering:** Tasks have an `orderIndex` computed via `MAX()` query for natural ordering
- **Due dates:** Optional due dates with progress tracking integration
- **Agent idempotency:** The `clientRequestId` column prevents AI agents from creating duplicate tasks on retry

### Permission Model

```
Can modify task if:
  user IS project.createdById
  OR user IS task.assignedToId
  OR (user IS org member AND org IS project.organizationId)
  OR (user IS project collaborator WITH permission = 'write')
```

---

## 9. Progress Tracking & Analytics

**Frontend:** `src/components/progress/ProgressFeedClient.tsx` (891 lines)  
**Route:** `/progress`

The progress tracking dashboard is a comprehensive analytics page that computes real-time statistics from project and task data.

### Metrics & Visualizations

1. **Overview Grid:**
   - Total projects count
   - Total tasks count
   - Completed tasks count
   - Completion rate (percentage)

2. **Per-Project Doughnut Charts (Pie Charts):**
   - Task status distribution (pending / in-progress / completed / blocked)
   - Large center-overlay showing completion percentage
   - Theme-aware color coding

3. **Contributor Breakdown:**
   - Task distribution per team member
   - Visual share representation

4. **Due Date Tracking:**
   - Overdue tasks identification
   - Upcoming deadlines

5. **7-Day Activity Bar Chart:**
   - Daily task creation/completion activity
   - Data source: `api.task.getOrgActivity` tRPC query

6. **Per-Project Detail View:**
   - Click any project to drill down
   - Individual task list with status indicators
   - Back navigation to overview

### Technical Details

- Uses **Chart.js** with `Doughnut` and `Bar` chart types via `react-chartjs-2`
- Custom theme-aware color system (`src/components/charts/theme-colors.ts`)
- Responsive layout with grid breakpoints
- Data fetched via `api.project.getMyProjects` and `api.task.getOrgActivity`
- Org-aware: respects the user's active organization context via `OrgSwitcher`

---

## 10. Events Publishing & Social Feed

**Backend:** `src/server/api/routers/event.ts` (308 lines)  
**Frontend:** `src/components/events/` (4 components)  
**Route:** `/publish`

### Features

#### Event CRUD
- **Create events** with: title, description, date/time, region (Bulgarian cities), image upload (UploadThing), RSVP toggle, reminder toggle
- **Region selection:** Interactive Google Maps picker (`RegionMapPicker.tsx`) with 10 Bulgarian cities as markers, or a `<select>` dropdown fallback if no Maps API key is configured

#### Social Features
- **Likes:** Toggle likes with optimistic UI updates (`useOptimisticLike` custom hook)
- **Comments:** Text and image comments with author metadata
- **RSVP:** Three-state RSVP (`going` / `maybe` / `not_going`) with optimistic updates
- **RSVP Dashboard:** Modal showing RSVP statistics with progress bars for each status

#### Event Feed
- Social media-style card layout with:
  - Event image, title, description, date, region badge
  - Like count and button
  - Comment thread with author names
  - RSVP button with status indicator
  - Delete button (author only)
- **Region filtering** via the map picker

#### Automated Reminders
- **`EventReminderService.tsx`:** Headless background client component
- Runs an interval every 5 minutes
- Calls `api.event.sendEventReminders` mutation
- Sends reminders for events with `sendReminders: true` that haven't been reminded yet
- Uses an `IntervalScheduler` class for clean start/stop lifecycle

### Backend Endpoints

| Endpoint | Description |
|---|---|
| `event.createEvent` | Create with title, description, date, region, image, RSVP, reminders |
| `event.getPublicEvents` | Fetch all events with author info, comment/like/RSVP counts, user's like/RSVP status |
| `event.addComment` | Add text/image comment |
| `event.toggleLike` | Toggle like (insert/delete on composite PK) |
| `event.updateRsvp` | Set RSVP status (upsert) |
| `event.deleteEvent` | Delete event (author only) |
| `event.sendEventReminders` | Batch send reminders for upcoming events |

---

## 11. Sticky Notes System

**Backend:** `src/server/api/routers/note.ts` (318 lines)  
**Frontend:** `src/components/notes/` (2 components)

### Features

- **Create notes** with optional password protection
- **Password protection:** When a password is provided, it's hashed with bcrypt (generated salt + hash). The content is only returned to the frontend after successful password verification.
- **Content hiding:** The `getAll` query returns `content: null` for password-protected notes — the client must unlock via `verifyPassword`
- **Unlock flow:**
  - User enters password → `api.note.verifyPassword` validates with `bcrypt.compare()`
  - "Keep unlocked until close" preference supported (from user settings)
  - 5-attempt lockout on failed password entries
- **Password reset:** Via a 4+ digit PIN (stored hashed with argon2)
  - `api.note.resetPasswordWithPin` validates the PIN and removes the password protection
  - Lockout after 5 failed attempts with timestamp tracking
- **CRUD:** Standard create, read, update, delete with ownership checks

### Frontend Components

- **`NotesList.tsx`** (702 lines): Full notes management UI with:
  - Note selection, editing, and deletion
  - Password unlock modal with attempt tracking
  - PIN-based password reset flow
  - Double-click-to-delete confirmation pattern
  - "Keep unlocked until close" toggle

- **`CreateNoteForm.tsx`** (113 lines): Note creation form with:
  - Content textarea
  - Optional password input
  - Internationalized labels

---

## 12. Direct Messaging & Chat

**Backend:** `src/server/api/routers/chat.ts` (339 lines)  
**Frontend:** `src/components/chat/ChatClient.tsx` (551 lines)  
**Route:** `/chat`

### Features

- **Project-scoped conversations:** DMs are scoped to specific projects, so the same two users can have separate conversations per project
- **Access control:** `assertProjectAccess()` verifies the caller is the project owner, an org member, or a collaborator
- **Conversation normalization:** `normalizePair()` deterministically orders user IDs to prevent duplicate conversations
- **Real-time polling:** Messages refresh every 2 seconds, conversations every 5 seconds
- **Optimistic sends:** Messages appear immediately in the UI, with rollback on error
- **File attachments:** Supported via UploadThing (`chatAttachment` endpoint)
- **New chat:** Search users by email, create conversations directly

### Backend Endpoints

| Endpoint | Description |
|---|---|
| `chat.listProjectUsers` | All users in a project (via org or collaborators) excluding self |
| `chat.getOrCreateProjectConversation` | Find or create a DM scoped to a project |
| `chat.getOrCreateDirectConversation` | Find or create a DM between two users |
| `chat.listMessages` | Paginated messages for a conversation |
| `chat.sendMessage` | Send text or image message |
| `chat.listProjectConversations` | All conversations in a project |
| `chat.listAllConversations` | All user's conversations across projects |

### AI Chat Integration — Unified Single-Chatbot UI

A key design decision in KAIROS is that **all three implemented agents (A1, A2, and A3) are combined into a single chat interface** — the user never has to know which agent is handling their request. The `ProjectIntelligenceChat` component (`src/components/projects/ProjectIntelligenceChat.tsx`, 423 lines) serves as the unified chatbot UI, accessible both as a full page at `/chat` and as a floating overlay via `A1ChatWidgetOverlay` from the side navigation.

#### How the Unified Routing Works

From the user's perspective, they send messages to one chatbot. Behind the scenes, `ProjectIntelligenceChat` uses **client-side intent detection** to route messages to the correct agent:

1. **Notes intent detection (`isNotesIntent`):** The component checks if the user's message contains keywords like `"note"`, `"notes"`, `"sticky"`, `"vault"`, `"summarize my notes"`, or `"organize my notes"`. If matched, the message is routed directly to the **A3 Notes Vault** agent via `api.agent.notesVaultDraft`.

2. **Default A1 routing:** All other messages are sent to the **A1 Workspace Concierge** via `api.agent.projectChatbot`, optionally scoped to a `projectId`.

3. **A1 → A2 handoff:** When A1 determines that the user's intent involves task modifications (e.g., "create tasks for this project"), it returns a `handoff` object with `targetAgent: "task_planner"` and the `userIntent`. The chat UI displays this delegation, and the A2 Task Planner can be invoked through the `AiTaskPlannerPanel` or `AiTaskDraftPanel` components embedded in the project management view.

#### Draft → Confirm → Apply in the Chat UI

For the A3 Notes Vault, the full lifecycle plays out **entirely within the chat conversation**:

- **Draft phase:** The user sends a notes-related message. The chat calls `notesVaultDraft`, receives the plan (creates/updates/deletes/blocked), and displays a summary with a **Confirm** button rendered inline in the agent's chat bubble.

- **Confirm phase:** The user clicks "Confirm". The chat calls `notesVaultConfirm`, receives a `confirmationToken`, and displays a confirmation message with an **Apply** button.

- **Apply phase:** The user clicks "Apply". The chat calls `notesVaultApply` with the `draftId` and `confirmationToken`, executes the operations, and displays the results (created/updated/deleted note IDs).

This means the user interacts with a single conversational interface, but three different AI agents may handle their requests — all with proper safety guardrails and human-in-the-loop approval for write operations.

#### UI Details

- **Chat layout:** Dark theme (`bg-zinc-900`), ChatGPT-style message bubbles — user messages on the right with accent color, agent messages on the left with elevated background.
- **Loading state:** "Thinking…" placeholder bubble while waiting for LLM response.
- **Copy to clipboard:** Click any message to copy its text.
- **Info panel:** Toggleable panel explaining that predictions are best-effort.
- **Input:** Rounded pill-style input with accent-colored send button, disabled while any mutation is pending.
- **Floating overlay:** `A1ChatWidgetOverlay` renders a fixed-position 420×560px panel (bottom-right) with the same `ProjectIntelligenceChat` inside, toggled from the side nav. Supports Escape to close and an "Expand" button to navigate to `/chat`.

---

## 13. Organization & Team Management

**Backend:** `src/server/api/routers/organization.ts` (497 lines)  
**Frontend:** `src/components/orgs/` (4 components)  
**Route:** `/orgs`

### Features

#### Organization Lifecycle
- **Create:** Organizations are created with a cryptographically secure access code (`XXXX-XXXX-XXXX` format, 62 bits of entropy via `crypto.getRandomValues`). A loop ensures uniqueness.
- **Join:** Members join by entering the access code. Validates the code and creates a membership entry.
- **Active org switching:** Users can set their active organization. This changes the `usageMode` to `"organization"` and updates `activeOrganizationId`. All subsequent project operations are scoped to this org.
- **Personal mode:** Users can switch back to personal mode (no org context).

#### Roles & Capabilities
- **Three roles:** `admin`, `worker`, `mentor`
- **Granular capabilities per member:**
  - `canCreateProjects`
  - `canAssignTasks`
  - `canManageMembers`
  - `canViewAllProjects`
  - `canEditOrgSettings`
- Admins can update member roles and capabilities

#### Member Management
- **List members:** Shows all org members with roles
- **Leave org:** Members can leave (admins have protection — must transfer admin first)
- **Update permissions:** Admins can modify member capabilities

### Frontend Components

| Component | Purpose |
|---|---|
| `OrgDashboardClient.tsx` | Organization list with active badge, role labels, access codes, "Set active" buttons |
| `OrgSwitcher.tsx` | Compact dropdown for switching active org from any page |
| `OrgAccessCodeBadge.tsx` | Stylized badge displaying the org's invite code |
| `WorkspaceIndicator.tsx` | Shows whether the user is in personal or organizational mode |

---

## 14. Notification System

**Backend:** `src/server/api/routers/notification.ts` (120 lines)  
**Frontend:** `src/components/notifications/NotificationSystem.tsx`

### Features

- **Four notification types:** `event`, `task`, `project`, `system`
- **Full CRUD:** Create, read, mark as read (single/bulk), delete (single/bulk)
- **Unread count:** Dedicated endpoint for badge display
- **Composite IDs:** Supports `prefix-id` format for client-side notification IDs (gracefully handles non-DB notifications)
- **Real-time:** Polled from the frontend at regular intervals

### Endpoints

| Endpoint | Description |
|---|---|
| `notification.getAll` | All notifications, ordered by `createdAt` desc |
| `notification.getUnreadCount` | Count of unread notifications |
| `notification.markAsRead` | Mark single notification as read |
| `notification.markAllAsRead` | Bulk mark all as read |
| `notification.delete` | Delete single notification |
| `notification.deleteAll` | Delete all notifications |
| `notification.create` | Create notification with type, title, message, link |

---

## 15. Internationalization (i18n)

**Config:** `src/i18n/config.ts`  
**Messages:** `src/i18n/messages/{locale}.json`

### Supported Languages

| Code | Language | Flag |
|---|---|---|
| `en` | English | 🇬🇧 |
| `bg` | Bulgarian | 🇧🇬 |
| `es` | Spanish | 🇪🇸 |
| `fr` | French | 🇫🇷 |
| `de` | German | 🇩🇪 |

### Implementation

- **Library:** `next-intl` v4.7
- **Locale detection:** Reads `NEXT_LOCALE` cookie (defaults to `en`)
- **Dynamic import:** Message files are imported dynamically based on locale
- **Fallback:** Falls back to `en.json` on import failure
- **Server components:** Uses `getRequestConfig` from `next-intl/server`
- **Client components:** Uses `useTranslations(namespace)` hook

### Translation Namespaces

| Namespace | Coverage |
|---|---|
| `nav` | Navigation labels, quick actions |
| `home` | Landing page content |
| `progress` | Progress dashboard labels, stats, analytics |
| `settings` | All settings sections (profile, notifications, security, appearance, language) |
| `create` | Workspace page — projects, tasks, notes, timeline |
| `publish` | Events page |
| `auth` | Sign in/out, welcome messages |
| `common` | Shared UI labels (Save, Cancel, Delete, Edit, etc.) |
| `org` | Organization management labels |
| `ai` | AI task generator labels (tabs, PDF upload, instructions) |

---

## 16. Theming & Appearance

### Theme System

- **Library:** `next-themes` v0.4
- **Modes:** `light`, `dark`, `system` (follows OS preference)
- **Persistence:** Theme is saved to the user's DB settings via `settings.updateAppearance` and applied on mount via `UserPreferencesProvider`

### Accent Colors

Six accent color presets:

| Color | Name |
|---|---|
| 🟣 | Purple |
| 🩷 | Pink |
| 🟤 | Caramel |
| 🟢 | Mint |
| 🔵 | Sky |
| 🔴 | Strawberry |

- Accent colors are applied as CSS custom properties on `<html>`
- Legacy migration from old names (e.g., `"indigo"` → `"purple"`) handled automatically
- Cached in `sessionStorage` for faster reloads
- Used throughout the UI via design tokens: `border-accent-primary`, `text-accent-primary`, etc.

### Design System

- **Custom design tokens** (via Tailwind CSS @theme):
  - Surface colors: `surface-card`, `surface-bg`, `surface-hover`
  - Text colors: `text-fg-primary`, `text-fg-secondary`, `text-fg-tertiary`
  - Border colors: `border-accent-primary`, `border-subtle`
- **Typography:** Space Grotesk (sans), Cinzel (display), Newsreader, Uncial Antiqua, Faustina — all loaded as CSS variables
- **Agent UI styles:** Dedicated CSS file (`src/styles/agents-ui.css`, 529 lines) with ChatGPT-like chat layouts, floating panels, agent shells, and iOS/Apple HIG-inspired controls

---

## 17. Email Service

**File:** `src/server/email.ts` (164 lines)

### Implementation

- **Provider:** Resend (`resend` npm package)
- **Purpose:** Sends branded HTML emails for password reset flows (note password recovery)
- **Template:** `PasswordResetEmailTemplate` — a styled HTML email with:
  - KAIROS gradient logo header
  - Personalized greeting
  - Reset button linking to `/reset-password?noteId=...&token=...`
  - Security notice (1-hour expiry)
  - Fallback plain-text URL
  - Styled footer
  - Plain-text alternative version
- **Service pattern:** Singleton `EmailService` class via `getEmailService()` factory
- **Configuration:**
  - `RESEND_API_KEY` — Resend API key
  - `NEXT_PUBLIC_APP_URL` — App base URL for reset links
  - `RESEND_FROM_EMAIL` — Sender address (defaults to `"Kairos <onboarding@resend.dev>"`)

---

## 18. Homepage & Landing Experience

**Route:** `/` (root page)  
**Frontend:** `src/components/homepage/` (5 components)

### Components

#### `HomeClient.tsx` (629 lines)
The main landing page component with:
- **Conditional rendering:** Authenticated users see a workspace dashboard; unauthenticated users see the marketing landing page
- **GSAP animations:** Scroll-triggered fade-in effects for feature cards
- **Role selection flow:** First-time users (created within last 5 minutes) are shown a `RoleSelectionModal` to choose between personal and organizational workspace modes
- **Account switching:** Detects `?switchAccount=1` query parameter to open `SignInModal`
- **Dynamic theming:** `useThemeColorTick` hook watches for accent color/theme changes via `MutationObserver` to trigger re-renders
- **Color utilities:** HSL-based hue rotation for dynamic gradient effects

#### `MagicBento.tsx` (833 lines)
Interactive bento grid showcasing 3 feature pillars:
1. **Organizations** — "Create dedicated spaces to assign roles and oversee progress…"
2. **Teams** — "Collaborate securely in real-time spaces…"
3. **Personal Goals** — "Master your focus. Never lose important notes…"

**Technical highlights:**
- GSAP + ScrollTrigger particle animation system
- Mouse tracking for spotlight effects
- Respects `prefers-reduced-motion` accessibility preference
- `ParticleCard` sub-component with tilt effects, magnetism, click effects
- Particle recycling via `cloneNode` for performance

#### `ScrollFloat.tsx`, `ScrollReveal.tsx`, `SplitText.tsx`
Supporting animation utilities for scroll-based reveals and text splitting effects.

---

## 19. File Structure Reference

```
KAIROS/
├── config/                          # Build & tooling configuration
│   ├── drizzle.config.ts            # Database migration config
│   ├── eslint.config.js             # Linting rules
│   ├── next.config.js               # Next.js configuration
│   ├── postcss.config.js            # PostCSS pipeline
│   ├── prettier.config.js           # Code formatting
│   └── tailwind.config.js           # Tailwind CSS theme
│
├── docs/                            # Documentation
│   ├── PROJECT_DOCUMENTATION.md     # Model research & recommendations
│   ├── agent-implementation-plan.md # Detailed agent implementation plan
│   ├── agent-env-vars.md            # Environment variable reference
│   ├── conversation-summary.md      # Development conversation log
│   ├── model-research.md            # LLM model evaluation
│   └── agents/                      # Per-agent specifications
│       ├── 1-workspace-concierge.md
│       ├── 2-task-planner.md
│       ├── 3-notes-vault.md
│       ├── 4-events-publisher.md
│       ├── 5-org-admin.md
│       ├── agent-suite-plan.md      # Master agent architecture plan
│       └── plans/                   # Implementation plans
│
├── src/
│   ├── env.js                       # Zod-validated environment variables
│   │
│   ├── app/                         # Next.js App Router pages
│   │   ├── layout.tsx               # Root layout (providers, fonts, metadata)
│   │   ├── page.tsx                 # Homepage (server component)
│   │   ├── not-found.tsx            # 404 page
│   │   ├── api/                     # API routes
│   │   │   ├── auth/                # NextAuth handlers
│   │   │   ├── trpc/                # tRPC HTTP handler
│   │   │   ├── uploadthing/         # File upload handler
│   │   │   └── account-switch/      # Account switching endpoint
│   │   ├── chat/page.tsx            # AI + DM chat page
│   │   ├── create/page.tsx          # Workspace creation hub
│   │   ├── orgs/page.tsx            # Organization dashboard
│   │   ├── progress/page.tsx        # Analytics dashboard
│   │   ├── projects/page.tsx        # Projects listing
│   │   ├── publish/page.tsx         # Events feed
│   │   ├── settings/page.tsx        # Settings page
│   │   └── reset-password/page.tsx  # Password reset page
│   │
│   ├── components/                  # React components
│   │   ├── auth/                    # Auth modals
│   │   ├── charts/                  # Chart.js configuration
│   │   ├── chat/                    # Chat UI (DM + AI widget)
│   │   ├── events/                  # Event feed, create form, map picker
│   │   ├── homepage/                # Landing page components
│   │   ├── layout/                  # SideNav, UserDisplay, Toggle
│   │   ├── notes/                   # Notes list, create form
│   │   ├── notifications/           # Notification system
│   │   ├── orgs/                    # Org dashboard, switcher, badges
│   │   ├── progress/                # Analytics dashboard
│   │   ├── projects/                # Project management (12 components)
│   │   ├── providers/               # Context providers (5)
│   │   ├── settings/                # Settings panels (5)
│   │   └── ui/                      # Shared UI primitives
│   │
│   ├── i18n/                        # Internationalization
│   │   ├── config.ts                # Locale config + dynamic import
│   │   └── messages/                # 5 locale JSON files
│   │
│   ├── lib/                         # Utility libraries
│   │   ├── utils.ts                 # Shared utilities
│   │   └── uploadthing.ts           # UploadThing configuration
│   │
│   ├── server/                      # Backend (server-only)
│   │   ├── accountSwitch.ts         # HMAC-signed account cookie codec
│   │   ├── email.ts                 # Resend email service
│   │   ├── agents/                  # AI Agent System
│   │   │   ├── context/             # Per-agent context builders (3)
│   │   │   ├── llm/                 # LLM client + JSON repair (2)
│   │   │   ├── orchestrator/        # Central orchestrator (1)
│   │   │   ├── pdf/                 # PDF text extractor (1)
│   │   │   ├── profiles/            # Agent profiles (2)
│   │   │   ├── prompts/             # System prompt templates (3)
│   │   │   ├── schemas/             # Zod output schemas (4)
│   │   │   └── tools/               # Agent tools (1 module)
│   │   ├── api/                     # tRPC API layer
│   │   │   ├── root.ts              # App router composition
│   │   │   ├── trpc.ts              # tRPC init, context, procedures
│   │   │   └── routers/             # Domain routers (11)
│   │   ├── auth/                    # NextAuth configuration
│   │   │   ├── config.ts            # Providers, callbacks, adapter
│   │   │   └── index.ts             # Auth exports
│   │   └── db/                      # Database
│   │       ├── index.ts             # Drizzle client initialization
│   │       ├── schema.ts            # Full schema (841 lines)
│   │       └── migrations/          # SQL migration files
│   │
│   ├── styles/                      # CSS
│   │   ├── globals.css              # Global styles + design tokens
│   │   ├── globals-mobile.css       # Mobile-specific styles
│   │   └── agents-ui.css            # AI agent chat UI styles
│   │
│   └── trpc/                        # tRPC client setup
│       ├── query-client.ts          # TanStack Query client
│       ├── react.tsx                # React tRPC hooks
│       └── server.ts                # Server-side tRPC caller
│
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript configuration
├── next.config.js                   # Next.js config (root)
├── tailwind.config.js               # Tailwind config (root)
└── eslint.config.js                 # ESLint config (root)
```

---

## Summary

KAIROS is a comprehensive unified productivity platform that stands out through:

1. **Platform convergence** — merging project management, task tracking, progress analytics, event publishing, notes, messaging, and team management into a single application with shared context.

2. **AI-native design** — a multi-agent system deeply integrated into the platform, where agents can reason about all workspace data and safely execute changes through a rigorous Draft → Confirm → Apply lifecycle with cryptographic verification.

3. **Open-source AI** — powered by Qwen 2.5 7B Instruct (default) and Phi 3.5 Mini Instruct (fallback), both fully open-source models accessed via HuggingFace Inference Providers, with deterministic routing rules and automatic JSON repair.

4. **Security-first approach** — from argon2/bcrypt password hashing, HMAC-signed cookies, and JWT sessions, to agent confirmation tokens with SHA-256 plan hashing and 10-minute expiration windows.

5. **Internationalization** — 5 languages with cookie-based locale switching and multilingual AI support.

6. **Theming flexibility** — light/dark/system modes with 6 accent color presets, persisted per-user and applied across all UI surfaces including the AI agent chat.

---

*Generated: February 2026 | KAIROS Platform Documentation v1.0*
