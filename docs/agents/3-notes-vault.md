# A3 — Notes Vault Agent (KAIROS)

## Purpose
Help manage sticky notes while respecting KAIROS note-locking semantics (locked notes must not have content exposed unless explicitly unlocked via the app’s flow).

---

## Best-practice techniques applied (sourced)

### Tool calling via schemas
OpenAI recommends clear, detailed function schemas and strict validation. Source: [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

### HITL approvals for risky tools
n8n HITL pattern: pause for Approve/Deny on risky tools, especially deletes/modifications. Source: [`docs.n8n.io/advanced-ai/human-in-the-loop-tools/`](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/).

### Security boundary thinking
NVIDIA guidance stresses limiting access to secrets and controlling risky operations. For notes, treat “locked content” as a secret class. Source: [`developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/`](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/).

---

## Responsibilities

1. **Create and organize notes**
- Templates (meeting notes, daily log)
- Tagging/categorization (if supported; otherwise embed tags in content)

2. **Summarize notes**
- Only unlocked notes.
- Locked notes: metadata only.

3. **Safe editing**
- Draft updates, require approval.

---

## Tool allowlist (Notes Vault)

### Read tools (Draft allowed)
- `listNotesMetadata`
- `getNoteContentIfUnlocked`

### Write tools (Apply only)
- `createNote`
- `updateNote` (only if unlocked)
- `deleteNote` (dangerous; require explicit approval)

---

## Locking policy (hard requirements)

- The agent never asks for, stores, or handles note passwords.
- If user requests edits to a locked note:
  - Draft should say: “Unlock the note in the UI first, then re-run.”
  - Or propose creating a new note.

UI evidence of lock flows:
- Note unlock/reset patterns are in [`src/components/notes/NotesList.tsx`](src/components/notes/NotesList.tsx:146).

---

## Zod schemas (conceptual)

### `NotesDraftPlan`
- `creates`: array of `{ title; content; shareStatus? }`
- `updates`: array of `{ noteId; patch: { title?; content? } }`
- `deletes`: array of `{ noteId; reason }`
- `blockedLockedEdits`: array of `{ noteId; reason }`

### `NoteContentGuard`
- `noteId`
- `isLocked`
- `unlockedInSession`: boolean

---

## Prompting strategy

- Always show which notes were included in a summary.
- If no unlocked notes exist, return a helpful next action.

---

## Audit and privacy

- Log note IDs only, not content, in audit tables.
- If summarizing content, store only the summary (optional) and avoid storing raw content.

---

## Repo integration

Backend note logic:
- [`src/server/api/routers/note.ts`](src/server/api/routers/note.ts:1)

The orchestrator tool wrappers should reuse the same policy checks implemented there.
