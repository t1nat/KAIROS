# A4 — Events Publisher Agent

## Overview

The Events Publisher (A4) is KAIROS's event-domain AI agent. It manages the full lifecycle of public events — creation, updates, moderation, RSVP handling, comments, and likes — all through a natural language chat interface with a mandatory human approval step before any writes hit the database.

| Field | Value |
|-------|-------|
| **Agent ID** | `events_publisher` |
| **Domain** | Events only (creation, updates, moderation, engagement) |
| **Lifecycle** | Draft → Confirm → Apply |
| **Max operations per draft** | 10 creates, 20 updates, 5 deletes, 20 comments, 20 RSVPs, 20 likes |

---

## What It Does

### 1. Event Creation
- Turns natural language prompts into structured event fields: title, description, date/time (ISO-8601 UTC), region, RSVP toggle, reminders, and optional cover image.
- Writes compelling titles and informative descriptions designed to attract attendance.
- Each created event gets a `clientRequestId` for idempotency.
- Supports batch creation (up to 10 events at once).

### 2. Event Updates
- Patches existing events: fix typos, change time/location, toggle RSVP/reminders.
- Only includes changed fields in the patch — unchanged fields are not echoed.
- Restricted to events the user owns (server-side guardrail enforced).

### 3. Event Deletion (Dangerous)
- Only on explicit user request, only for events the user owns.
- Flagged as `dangerous: true` with a mandatory reason string.
- Red-highlighted in the confirmation diff preview.
- Max 5 deletions per draft.

### 4. Comment Management
- **Add comments** — up to 20 per draft, with text content (1–500 chars).
- **Delete comments** — flagged as dangerous, requires reason and explicit request.

### 5. RSVP Management
- Sets RSVP status (`going`, `maybe`, `not_going`) on events that have `enableRsvp=true`.
- Upserts: removes existing RSVP then inserts the new status.

### 6. Like Toggling
- Toggles likes on events. The system checks current like state automatically.

---

## What It Cannot Do

- Access or modify tasks, notes, projects, or organization settings.
- Act on events the user does not own (for updates/deletes).
- Execute any write directly — all mutations go through the Draft → Confirm → Apply lifecycle.
- Invent event IDs, comment IDs, or user IDs. Only IDs present in the loaded context are valid.

---

## How It Works (Architecture)

### Request Flow

```
User message (chat)
        │
        ▼
┌─────────────────────────┐
│  Client-side routing     │    Keyword detection or A1 handoff
│  (ProjectIntelligenceChat│    routes events intent to A4
│   component)             │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  tRPC agent router       │    eventsPublisherDraft / Confirm / Apply
│  (src/server/api/        │
│   routers/agent.ts)      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Agent Orchestrator      │    Loads context, calls LLM, validates output,
│  (agentOrchestrator.ts)  │    enforces guardrails, mints HMAC tokens
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  A4 Context Builder      │    Fetches 30 most recent events with like/comment
│  (a4ContextBuilder.ts)   │    counts, ownership flags, author names
└──────────────────────────┘
```

### Draft → Confirm → Apply Lifecycle

1. **Draft** — User sends a message. The orchestrator:
   - Builds context (recent events, ownership info, engagement counts).
   - Sends the A4 system prompt + user message to the LLM (temperature 0.2, JSON mode).
   - Validates the response against `EventsPublisherDraftSchema`.
   - Applies server-side guardrails (strips deletes/updates for non-owned events).
   - Computes a plan hash and stores the draft.
   - Returns `{ draftId, plan }` to the client for preview.

2. **Confirm** — User clicks "Confirm Event Plan". The orchestrator:
   - Verifies draft exists and belongs to the user.
   - Recomputes the plan hash.
   - Mints an HMAC-SHA256 signed confirmation token (10-minute TTL, signed with `AUTH_SECRET`).
   - Returns `{ confirmationToken, summary }` with operation counts.

3. **Apply** — User clicks "Apply Event Plan". The orchestrator:
   - Verifies the HMAC token signature with `crypto.timingSafeEqual`.
   - Checks token hasn't expired and plan hash hasn't changed since confirmation.
   - Executes all operations against the database in sequence: creates → updates → deletes → comments → RSVPs → likes.
   - Cleans up the draft from the store.
   - Returns operation results with created/updated/deleted IDs.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `src/server/agents/profiles/a4EventsPublisher.ts` | Agent profile: ID, name, tool allowlists |
| `src/server/agents/schemas/a4EventsPublisherSchemas.ts` | Zod schemas for draft plan, input/output types |
| `src/server/agents/prompts/a4Prompts.ts` | System prompt with rules, rubric, output schema |
| `src/server/agents/context/a4ContextBuilder.ts` | Builds context pack (30 recent events with metadata) |
| `src/server/agents/orchestrator/agentOrchestrator.ts` | Draft/Confirm/Apply implementation (lines ~1120–1370) |
| `src/server/api/routers/agent.ts` | tRPC endpoints: `eventsPublisherDraft`, `eventsPublisherConfirm`, `eventsPublisherApply` |
| `src/components/projects/ProjectIntelligenceChat.tsx` | Client-side chat UI with A4 action buttons |
| `src/server/api/routers/event.ts` | Underlying event CRUD router (used by both manual UI and agent) |

---

## Tool Allowlists

### Read Tools (Draft phase)
| Tool | Description |
|------|-------------|
| `listEventsPublic` | List public events with metadata |
| `getEventDetail` | Get full detail of a single event |

### Write Tools (Apply phase only)
| Tool | Description |
|------|-------------|
| `createEvent` | Create a new event |
| `updateEvent` | Patch an existing event |
| `deleteEvent` | Delete an event (**dangerous**) |
| `addEventComment` | Add a comment to an event |
| `deleteEventComment` | Delete a comment (**dangerous**) |
| `setEventRsvp` | Set RSVP status for the user |
| `toggleEventLike` | Toggle like on an event |

---

## Safety & Guardrails

1. **Ownership enforcement** — The orchestrator filters out deletes and updates for events the user doesn't own before saving the draft.
2. **HMAC token signing** — Confirmation tokens are signed with `AUTH_SECRET` using HMAC-SHA256 and verified with `crypto.timingSafeEqual` to prevent tampering.
3. **Plan hash integrity** — A hash of the plan is computed at draft time and verified at apply time to ensure the plan wasn't modified between confirmation and execution.
4. **Token expiry** — Confirmation tokens expire after 10 minutes.
5. **Dangerous operation flags** — Deletes (events and comments) require `dangerous: true` and a reason string, presented with red highlighting in the UI.
6. **Domain isolation** — A4 cannot access tasks, notes, projects, or org settings. Cross-domain requests are politely declined.
7. **JSON-only output** — The LLM is instructed to return strict JSON only, validated against `EventsPublisherDraftSchema`.

---

## Context Pack

The A4 context builder (`a4ContextBuilder.ts`) loads up to 30 recent events with:

- Event ID, title, description, date, region, image URL
- RSVP enabled flag
- Like count and comment count (computed via subqueries)
- `isOwner` flag (whether the current user created the event)
- Author name
- Creation timestamp

This context is injected into the system prompt so the LLM can make informed decisions about which events exist and what operations are valid.

---

## Regions

Events are scoped to Bulgarian regions:

`sofia` · `plovdiv` · `varna` · `burgas` · `ruse` · `stara_zagora` · `pleven` · `sliven` · `dobrich` · `shumen`

If the user doesn't specify a region, the agent asks via `questionsForUser` rather than guessing.

---

## Client Integration

The `ProjectIntelligenceChat` component detects event-related intent using keyword matching (`event`, `events`, `publish`, `rsvp`, `attend`). When detected, the message is routed to `eventsPublisherDraft` instead of the default A1 concierge.

The agent's response is displayed in the chat with action buttons:
- **Confirm Event Plan** — triggers `eventsPublisherConfirm`
- **Apply Event Plan** — triggers `eventsPublisherApply` (only after confirmation)

Both buttons show loading states and handle errors gracefully (e.g., already-confirmed drafts, expired tokens).
