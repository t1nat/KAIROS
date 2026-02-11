# A3 — Notes Vault Agent: Implementation Plan (KAIROS)

> Goal: implement the third agent (A3) that manages notes **safely** with KAIROS’ note-locking semantics, integrated into the existing agent orchestrator + TRPC + UI. This plan is written to match the current repo structure and conventions.

## 0. Key constraints / non-goals

- **Never exfiltrate locked content**: A3 must not read or summarize locked note content unless the app already unlocked it via existing UI flow.
- **No passwords**: A3 must not request, store, log, or process note passwords.
- **No new UI theme**: reuse existing KAIROS styling tokens/classes (e.g. `kairos-bg-*`, `kairos-fg-*`, `kairos-section-border`, `kairos-divider`) and interaction patterns used in notes + projects UIs.
- **Model provider**: A3 must work with the existing model client but configured for **HuggingFace Qwen** as primary and **Phi** as fallback (not OpenAI-specific).

## 1. Current repo touchpoints (what already exists)

### Notes backend
- Notes router exists at [`src/server/api/routers/note.ts`](src/server/api/routers/note.ts:1)
- Notes locking UI exists at [`src/components/notes/NotesList.tsx`](src/components/notes/NotesList.tsx:1)
- Notes create UI exists at [`src/components/notes/CreateNoteForm.tsx`](src/components/notes/CreateNoteForm.tsx:1)

### Agents platform (A1/A2 patterns to mirror)
- Orchestrator: [`src/server/agents/orchestrator/agentOrchestrator.ts`](src/server/agents/orchestrator/agentOrchestrator.ts:1)
- Context builder patterns: [`src/server/agents/context/a2ContextBuilder.ts`](src/server/agents/context/a2ContextBuilder.ts:1)
- Prompt patterns: [`src/server/agents/prompts/a2Prompts.ts`](src/server/agents/prompts/a2Prompts.ts:1)
- Schema validation + repair: [`src/server/agents/llm/jsonRepair.ts`](src/server/agents/llm/jsonRepair.ts:1)
- Agent API router: [`src/server/api/routers/agent.ts`](src/server/api/routers/agent.ts:1)

## 2. Deliverables

### 2.1 Backend
1. A3 profile
2. A3 prompt
3. A3 Zod schemas (draft/confirm/apply)
4. A3 context builder (notes-scoped)
5. Orchestrator endpoints for A3 (draft/confirm/apply)
6. Persistence tables for A3 drafts/applies (optional but recommended for parity with A2)

### 2.2 UI
1. Add “Notes Vault Agent” panel in **Notes page** (positioned in the notes page layout, above the list or beside create form depending on current layout)
2. Panel supports:
   - Draft generation (agent proposes creates/updates/deletes)
   - Confirmation step (shows counts + preview)
   - Apply step (executes writes)
3. The panel must not display locked note content; it may display note metadata only.

## 3. Data model & persistence

### 3.1 Minimal viable approach (no new tables)
- A3 can be stateless: draft result returned to UI only.
- Downside: no audit trail / retry safety.

### 3.2 Recommended approach (A2 parity)
Create persistence similar to `agent_task_planner_drafts/applies`:

- `agent_notes_vault_drafts`
- `agent_notes_vault_applies`

**Files affected**
- DB schema: [`src/server/db/schema.ts`](src/server/db/schema.ts:1)
- New migration in [`src/server/db/migrations/`](src/server/db/migrations:1)

**Drafts table fields (recommended)**
- `id` (string)
- `user_id` (uuid/varchar)
- `message`
- `plan_json`
- `plan_hash`
- `status` enum: `draft | confirmed | applied | expired`
- `confirmation_token`
- `confirmed_at`, `applied_at`, `expires_at`, `created_at`, `updated_at`

**Applies table fields (recommended)**
- `id` serial
- `draft_id`
- `user_id`
- `plan_hash`
- `result_json`
- `created_at`

## 4. A3 plan format (schemas)

Create a new schema file:
- [`src/server/agents/schemas/a3NotesVaultSchemas.ts`](src/server/agents/schemas/a3NotesVaultSchemas.ts:1)

### 4.1 Scope schema
- `agentId`: literal `"notes_vault"`
- `scope`: object
  - `orgId?`: string | number
  - `projectId?`: string | number (optional, notes may be workspace-scoped)

### 4.2 Draft output schema (core)
`NotesVaultPlanDraft` (JSON mode output from model):
- `agentId: "notes_vault"`
- `scope`
- `creates: Array<{ title: string; content: string; shareStatus?: "private"|"shared_read"|"shared_write" }>`
- `updates: Array<{ noteId: number; patch: { title?: string; content?: string; shareStatus?: ... } }>`
- `deletes: Array<{ noteId: number; dangerous: boolean; reason: string }>`
- `blockedLockedEdits: Array<{ noteId: number; reason: string }>`
- `summary: string`

### 4.3 Hard validation rules
- `content` in updates must only be allowed if the note is **unlocked in current session** (see tool guard below)
- Deletes must require `dangerous: true` and require UI confirmation (HITL)

## 5. A3 tooling + guardrails

A3 should not directly query DB tables; it should call **allowed tools** that wrap existing note router logic.

### 5.1 Read tools (draft allowed)
- `listNotesMetadata`
  - returns: `{ id, title, createdAt, updatedAt, shareStatus, isLocked }[]`
- `getNoteContentIfUnlocked`
  - input: `{ noteId }`
  - returns:
    - if locked: `{ noteId, isLocked: true }`
    - if unlocked: `{ noteId, isLocked: false, content }`

### 5.2 Write tools (apply only)
- `createNote`
- `updateNote`
- `deleteNote` (dangerous)

### 5.3 Where to implement tools
Add a new tools module similar to A1/A2 patterns:
- [`src/server/agents/tools/a3/notesTools.ts`](src/server/agents/tools/a3/notesTools.ts:1)

It should call the same business rules used by [`noteRouter`](src/server/api/routers/note.ts:1) (or extract shared helpers if needed).

## 6. Prompts (provider-agnostic; HF Qwen + Phi fallback)

### 6.1 Prompt file
- [`src/server/agents/prompts/a3Prompts.ts`](src/server/agents/prompts/a3Prompts.ts:1)

### 6.2 Prompt requirements
- Must explicitly state:
  - never request passwords
  - never output locked content
  - if user asks to modify a locked note, add entry to `blockedLockedEdits` and propose alternatives
  - keep outputs strict JSON that matches `NotesVaultPlanDraft`

### 6.3 Model client compatibility
The prompt must not rely on OpenAI-specific features. It must work with the repo’s `chatCompletion()` abstraction in [`src/server/agents/llm/modelClient.ts`](src/server/agents/llm/modelClient.ts:1).

Implementation note:
- Ensure `chatCompletion()` supports:
  - Qwen as primary
  - Phi as fallback
  - `jsonMode` behavior for providers that don’t strictly support JSON mode:
    - if provider doesn’t support JSON mode, enforce JSON through prompt + post-parse repair loop via [`parseAndValidate()`](src/server/agents/llm/jsonRepair.ts:1)

## 7. Orchestrator implementation

### 7.1 Add agent id
Extend orchestrator types:
- `AgentId` should include `"notes_vault"` in [`src/server/agents/orchestrator/agentOrchestrator.ts`](src/server/agents/orchestrator/agentOrchestrator.ts:45)

### 7.2 Add A3 endpoints
Add methods analogous to A2:
- `notesVaultDraft()`
- `notesVaultConfirm()`
- `notesVaultApply()`

These should:
1. build A3 context pack
2. call model
3. parse/validate
4. (optional) persist draft
5. confirm step mints token
6. apply step executes tools/writes

### 7.3 Expose via TRPC agent router
In [`src/server/api/routers/agent.ts`](src/server/api/routers/agent.ts:1) add:
- `notesVaultDraft`
- `notesVaultConfirm`
- `notesVaultApply`

## 8. Context builder (A3)

Create:
- [`src/server/agents/context/a3ContextBuilder.ts`](src/server/agents/context/a3ContextBuilder.ts:1)

Context should include:
- session user basics
- active org context (if any)
- **notes metadata list** (never include content for locked notes)

Use patterns from [`buildA2Context()`](src/server/agents/context/a2ContextBuilder.ts:35).

## 9. UI implementation (Notes page placement)

### 9.1 Where to place
Notes page route:
- [`src/app/notes/page.tsx`](src/app/notes/page.tsx:1)

Add a new panel component:
- [`src/components/notes/AiNotesVaultPanel.tsx`](src/components/notes/AiNotesVaultPanel.tsx:1)

Place it at the top of notes page content ("positioned in the notes page"):
- Above the notes list, near create note form.

### 9.2 UI behaviors
- Input textarea: “What do you want to do with your notes?”
- Draft button: calls `api.agent.notesVaultDraft`
- Shows plan preview:
  - counts + list of operations
  - for updates/deletes: show note title + id (metadata) and reason
  - do **not** show locked note content
- Confirm button: calls `api.agent.notesVaultConfirm`
- Apply button: calls `api.agent.notesVaultApply`
- Show toasts using existing patterns from project/task planner panels.

### 9.3 Styling
Match existing panels:
- Use the same container classes used in [`src/components/projects/AiTaskPlannerPanel.tsx`](src/components/projects/AiTaskPlannerPanel.tsx:1)
- Use existing typography sizes and `kairos-*` classes.

## 10. Testing / verification checklist

1. Locked note cannot be summarized (only metadata appears)
2. Attempt to edit locked note results in `blockedLockedEdits` entry
3. Deletes require explicit confirmation token + UI user action
4. Qwen primary works; Phi fallback works when Qwen errors/timeouts
5. No note content is logged in DB audit tables; only IDs + summaries

## 11. Files & folders to create (summary)

Backend:
- [`src/server/agents/profiles/a3NotesVault.ts`](src/server/agents/profiles/a3NotesVault.ts:1)
- [`src/server/agents/schemas/a3NotesVaultSchemas.ts`](src/server/agents/schemas/a3NotesVaultSchemas.ts:1)
- [`src/server/agents/prompts/a3Prompts.ts`](src/server/agents/prompts/a3Prompts.ts:1)
- [`src/server/agents/context/a3ContextBuilder.ts`](src/server/agents/context/a3ContextBuilder.ts:1)
- [`src/server/agents/tools/a3/notesTools.ts`](src/server/agents/tools/a3/notesTools.ts:1)

Optional persistence:
- migration + schema additions in [`src/server/db/schema.ts`](src/server/db/schema.ts:1)
- new SQL migration in [`src/server/db/migrations/`](src/server/db/migrations:1)

TRPC:
- extend [`src/server/api/routers/agent.ts`](src/server/api/routers/agent.ts:1)

UI:
- [`src/components/notes/AiNotesVaultPanel.tsx`](src/components/notes/AiNotesVaultPanel.tsx:1)
- wire into [`src/app/notes/page.tsx`](src/app/notes/page.tsx:1)

## 12. Update existing doc to remove OpenAI-specific references

Replace the old notes vault doc with provider-agnostic phrasing and reference the repo abstraction at [`chatCompletion()`](src/server/agents/llm/modelClient.ts:1) rather than OpenAI docs.
