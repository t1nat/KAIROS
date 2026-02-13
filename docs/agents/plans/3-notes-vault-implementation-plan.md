# A3 — Notes Vault Agent: Implementation Plan (KAIROS)

> Goal: implement agent **A3 (Notes Vault)** that can help users organize and edit their **sticky notes** while respecting KAIROS’ existing password-lock semantics.
>
> Integration requirement (project-specific): **there will be no Notes page AI panel**. Notes Vault must be invoked **through the existing A1 chatbot UX** (both the widget overlay and `/chat` page), routed via the **same TRPC endpoint**, with UI changes limited to rendering/confirm flows.

## 0) Scope, constraints, and non-goals

### Hard constraints (must-haves)

- **No password handling**: A3 must never ask for, store, log, or process note passwords or reset PINs.
- **No exfiltration of locked note content**:
  - When a note is password-protected, A3 can only use metadata (e.g. note id, createdAt, shareStatus).
  - A3 must not request unlocking by prompting for a password.
  - A3 may only use plaintext content for a locked note if that content was already unlocked in the UI and explicitly provided via `handoffContext` (see section 2).
- **Write operations require HITL**: create/update/delete must be behind a confirm/apply step (same pattern as A2).

### Non-goals (for this iteration)

- **No new note fields** (e.g. title/tags) in the DB. Notes are currently just `content` plus lock fields in [`stickyNotes`](src/server/db/schema.ts:331).
- **No new Notes page UI** for the agent. All interactions happen through A1 chat.
- **No cross-user/org sharing changes**. Notes are currently scoped to the owning user via [`noteRouter.getAll`](src/server/api/routers/note.ts:68).

## 1) Current project realities (what exists today)

### Notes backend

- Notes are stored in [`stickyNotes`](src/server/db/schema.ts:331) and exposed via [`noteRouter`](src/server/api/routers/note.ts:9).
- `getAll` returns `content: null` for password-protected notes (guardrail) in [`noteRouter.getAll`](src/server/api/routers/note.ts:68).
- `verifyPassword` returns plaintext content when correct password is provided in [`noteRouter.verifyPassword`](src/server/api/routers/note.ts:184).
- `update` currently does not enforce password checks (ownership-only) in [`noteRouter.update`](src/server/api/routers/note.ts:137).

### Notes UI lock/unlock semantics (client-side)

- Notes UI maintains an `unlockedNotes` map in [`NotesList`](src/components/notes/NotesList.tsx:10).
- Unlocking is done by calling `api.note.verifyPassword` and caching returned content in component state in [`NotesList`](src/components/notes/NotesList.tsx:80).

### Agents platform patterns to mirror

- A2 draft/confirm/apply pattern in [`agentOrchestrator.taskPlannerDraft()`](src/server/agents/orchestrator/agentOrchestrator.ts:133).
- TRPC exposure via [`agentRouter`](src/server/api/routers/agent.ts:15).
- JSON output validation via [`parseAndValidate()`](src/server/agents/llm/jsonRepair.ts:1).

## 2) Design: safe access to unlocked content (no passwords)

The server does not currently have a concept of “unlocked-in-session”. Unlocked note content is held in React state in [`NotesList`](src/components/notes/NotesList.tsx:17).

To allow Notes Vault to summarize or edit content **without ever handling passwords**, we use an explicit UI → orchestrator handoff.

### 2.1 `handoffContext` contract

Reuse the existing A2-style optional `handoffContext?: Record<string, unknown>` (already present on [`taskPlannerDraft`](src/server/agents/orchestrator/agentOrchestrator.ts:133)).

For Notes Vault, define a supported handoff shape:

```ts
{
  unlockedNotes: Array<{ noteId: number; content: string }>
}
```

Rules:

- The UI must only send content it already has in memory (i.e. after `verifyPassword` succeeded).
- The orchestrator must treat this handoff as the only permitted source of plaintext for locked notes.
- If a note is locked and not present in `handoffContext.unlockedNotes`, it must be treated as locked.

### 2.2 Where the handoff is gathered (A1 chat surfaces)

Because we are not adding a Notes page panel, the A1 chat UI must be able to provide `handoffContext`.

Minimum viable approach:

- When the user is on a Notes-related surface that already has access to `unlockedNotes` (e.g. the notes page), A1 chat can be given access to that map via a shared store/context.
- When A1 chat is used elsewhere (widget overlay from another page), `handoffContext.unlockedNotes` can be empty; locked-note edits will be blocked.

## 3) Deliverables (what to implement)

### 3.1 Backend (A3 Notes Vault)

1) **A3 Zod schemas** (plan output + draft/confirm/apply inputs).
2) **A3 prompt(s)** (system prompt + strict JSON contract).
3) **A3 context builder** (notes metadata + optional unlocked content from handoff).
4) **A3 orchestrator methods**:
   - `notesVaultDraft`
   - `notesVaultConfirm`
   - `notesVaultApply`
5) **TRPC router endpoints** under [`agentRouter`](src/server/api/routers/agent.ts:15).
6) **(Recommended) Persistence tables** for drafts/applies (A2 parity).

### 3.2 A1 chatbot integration (no new notes UI)

1) Add A1 routing so note-related user messages can invoke A3.
2) Ensure both A1 chat surfaces (widget overlay and `/chat`) call the same TRPC endpoint and render the same response types.
3) Implement confirm/apply UX in chat (buttons or explicit user confirmation messages), but do not create a notes-specific panel.

## 4) Data model & persistence (align with A2 approach)

A2 persists drafts/applies in [`agentTaskPlannerDrafts`](src/server/db/schema.ts:274) and [`agentTaskPlannerApplies`](src/server/db/schema.ts:305). For auditability and retries, A3 should do the same.

### 4.1 Recommended tables

Add:

- `agent_notes_vault_draft_status` enum: `draft | confirmed | applied | expired`
- `agent_notes_vault_drafts`
- `agent_notes_vault_applies`

Privacy rule:

- Avoid storing raw note content in DB.
- Store:
  - ids
  - operation types
  - reasons
  - hashes
  - timestamps

If literal `nextContent` is stored, treat it as sensitive and confirm this is acceptable.

## 5) A3 plan format (schemas)

Create:

- [`src/server/agents/schemas/a3NotesVaultSchemas.ts`](src/server/agents/schemas/a3NotesVaultSchemas.ts:1)

### 5.1 Draft output schema (model → app)

Notes are currently `content`-only (no title column). Proposed JSON schema:

- `agentId: "notes_vault"`
- `planHash?: string` (server-added)
- `operations: Array<Operation>`
- `blocked: Array<{ noteId: number; reason: string }>`
- `summary: string`

`Operation` union:

- Create: `{ type: "create"; content: string; reason?: string }`
- Update: `{ type: "update"; noteId: number; nextContent: string; reason?: string; requiresUnlocked: boolean }`
- Delete: `{ type: "delete"; noteId: number; reason: string; dangerous: true }`

### 5.2 Server-side validation rules

- Any update targeting a password-protected note must set `requiresUnlocked: true`.
- Apply-time guard:
  - If `requiresUnlocked` is true and the note is not present in apply-time `handoffContext.unlockedNotes`, do not apply that operation.
- Deletes require `dangerous: true` and a valid confirmation token.

## 6) Prompts (provider-agnostic)

Create:

- [`src/server/agents/prompts/a3Prompts.ts`](src/server/agents/prompts/a3Prompts.ts:1)

Prompt requirements:

- Never ask for passwords/PINs.
- Locked notes are unreadable.
- Only use unlocked note content if it is present in context.
- Output strict JSON matching the schema.
- Compatible with [`chatCompletion()`](src/server/agents/llm/modelClient.ts:1).

## 7) Context builder (A3)

Create:

- [`src/server/agents/context/a3ContextBuilder.ts`](src/server/agents/context/a3ContextBuilder.ts:1)

Context includes:

- user id
- notes list with:
  - `id`, `createdAt`, `shareStatus`, `isLocked`
  - optional `unlockedContent` for notes included in `handoffContext.unlockedNotes`

Do not include `passwordHash` or `passwordSalt` in LLM context.

## 8) Orchestrator + TRPC integration (A3)

Update [`AgentId`](src/server/agents/orchestrator/agentOrchestrator.ts:45) to include `notes_vault`.

Add A3 methods analogous to A2:

- `notesVaultDraft({ ctx, message, handoffContext? })`
- `notesVaultConfirm({ ctx, draftId })`
- `notesVaultApply({ ctx, draftId, confirmationToken, handoffContext? })`

Expose via [`agentRouter`](src/server/api/routers/agent.ts:15):

- `notesVaultDraft`
- `notesVaultConfirm`
- `notesVaultApply`

## 9) A1 chatbot integration plan (routing Notes Vault through A1)

### 9.1 Single TRPC endpoint strategy (shared by widget + `/chat`)

Target behavior:

- Both A1 chat UIs call the same backend route(s).
- UI is responsible only for rendering and sending user messages + optional `handoffContext`.

Implementation options:

1) **Preferred (minimal change to existing architecture)**
   - Add new TRPC endpoints (`notesVaultDraft/Confirm/Apply`) under [`agentRouter`](src/server/api/routers/agent.ts:15).
   - Update the A1 chat client to call these endpoints when the user intent is “notes management”.

2) Alternate
   - Extend existing A1 `draft` endpoint to accept an `agentId` union including `notes_vault`, and route internally.

### 9.2 A1 intent routing

Add lightweight classification in the A1 chat path:

- If user message clearly targets notes (keywords like note, notes, sticky note, vault, lock/unlock, summarize my notes), route to Notes Vault.
- Otherwise, use existing A1 behavior.

Keep classification deterministic and transparent (e.g., include in logs/telemetry, but never include note content).

### 9.3 HITL inside chat

Since there is no notes panel, HITL is performed in-chat:

- Draft response renders a preview of operations (counts + per-op note ids + reasons).
- Confirm action:
  - user clicks a Confirm button or types a confirm phrase
  - client calls `notesVaultConfirm`
- Apply action:
  - user clicks Apply
  - client calls `notesVaultApply`

## 10) UI work required (rendering only)

Do not add a Notes page panel.

Instead:

- Extend the A1 chat message renderer to handle:
  - a Notes Vault draft payload
  - a Notes Vault confirmation payload (token + summary)
  - an apply result payload
- Add generic confirm/apply UI controls that work in both:
  - [`src/components/chat/A1ChatWidgetOverlay.tsx`](src/components/chat/A1ChatWidgetOverlay.tsx:1)
  - [`src/app/chat/page.tsx`](src/app/chat/page.tsx:1)

The controls should be agent-agnostic where possible (reusable for future agents).

## 11) Testing / verification checklist

- Locked notes never appear with plaintext in LLM context.
- Notes Vault never requests passwords or reset PINs.
- Notes Vault cannot update a locked note unless that note’s content was provided in apply-time `handoffContext.unlockedNotes`.
- Deletes require explicit confirmation token and expire correctly.
- Both A1 chat surfaces (overlay + `/chat`) can draft/confirm/apply Notes Vault plans through the same TRPC endpoint.

## 12) Files to create / modify (concrete list)

Backend:

- Create [`src/server/agents/schemas/a3NotesVaultSchemas.ts`](src/server/agents/schemas/a3NotesVaultSchemas.ts:1)
- Create [`src/server/agents/prompts/a3Prompts.ts`](src/server/agents/prompts/a3Prompts.ts:1)
- Create [`src/server/agents/context/a3ContextBuilder.ts`](src/server/agents/context/a3ContextBuilder.ts:1)
- Modify [`src/server/agents/orchestrator/agentOrchestrator.ts`](src/server/agents/orchestrator/agentOrchestrator.ts:1) (add A3 methods + AgentId)
- Modify [`src/server/api/routers/agent.ts`](src/server/api/routers/agent.ts:1) (add TRPC endpoints)

DB (recommended):

- Modify [`src/server/db/schema.ts`](src/server/db/schema.ts:1) (add A3 drafts/applies tables)
- Add new migration under [`src/server/db/migrations/`](src/server/db/migrations:1)

UI (A1 chat only):

- Modify chat rendering/actions in [`src/components/chat/A1ChatWidgetOverlay.tsx`](src/components/chat/A1ChatWidgetOverlay.tsx:1)
- Modify chat rendering/actions in [`src/app/chat/page.tsx`](src/app/chat/page.tsx:1)

---

### Notes on adjustments vs prior plan versions

- Removed the Notes page AI panel entirely; all interaction is routed through A1 chat.
- Explicitly added the A1 routing + in-chat HITL confirm/apply workflow.
- Kept the locked-note boundary by using UI → server `handoffContext` for unlocked content instead of any password handling.
