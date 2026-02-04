# A4 — Events Publisher Agent (KAIROS)

## Purpose
Create, update, and moderate events in the public events feed, including drafting announcements and managing engagement actions.

Events UI entrypoint:
- [`src/app/publish/page.tsx`](src/app/publish/page.tsx:1) renders the Events page.

---

## Best-practice techniques applied (sourced)

### Tool calling flow
OpenAI function calling is explicitly “model proposes tool call; app executes; model finalizes.” Source: [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

### Approval for risky actions
HITL: require approval for tools that delete or modify records. Source: [`docs.n8n.io/advanced-ai/human-in-the-loop-tools/`](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/).

### Security boundary and allowlists
NVIDIA recommends deny-by-default on risky capabilities; we apply this by:
- limiting tools
- separating moderation tools from create tools
- requiring explicit approval each time for deletes.
Source: NVIDIA blog [`developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/`](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/).

---

## Responsibilities

1. **Event creation**
- Turn a prompt into event fields (title, description, date/time, location/region, image).
- Provide a “preview card” in draft.

2. **Event updates**
- Fix typos, update time/location.

3. **Engagement & moderation**
- Add official comments.
- Delete comments (requires elevated permission).
- Delete events (dangerous).

---

## Tool allowlist (Events Publisher)

### Read tools (Draft allowed)
- `listEventsPublic`
- `getEventDetail`

### Write tools (Apply only)
- `createEvent`
- `updateEvent`
- `deleteEvent` (dangerous)
- `addEventComment`
- `deleteEventComment` (dangerous)
- `setEventRsvp` (usually user-driven; allow if needed)
- `toggleEventLike` (usually user-driven; allow if needed)

---

## Draft/confirm UX requirements

Draft must include:
- normalized date/time
- region/location constraints
- visibility/share status
- potential audience impact

Confirm screen:
- show diff vs current event
- highlight deletions in red

---

## Zod schemas (conceptual)

### `EventDraftPlan`
- `creates`: array of `{ title; description; startsAt; endsAt?; region; coverImageUrl?; locationText? }`
- `updates`: array of `{ eventId; patch: {...} }`
- `moderation`: array of `{ action: "delete_comment" | "delete_event"; targetId; reason }`

### Moderation policy
- only author or org admin can delete.
- enforce server-side checks mirroring router behavior.

---

## Repo integration

Event router:
- [`src/server/api/routers/event.ts`](src/server/api/routers/event.ts:1)

Event feed UI:
- [`src/components/events/EventFeed.tsx`](src/components/events/EventFeed.tsx:764)

The tool wrappers should reuse the same permission and query shapes as the router.
