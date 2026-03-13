# KAIROS AI Agent System — Architecture Summary

> Quick reference for understanding how the AI agents work, communicate, and hand off tasks.

---

## Agents Overview

| Agent | ID | Role |
|---|---|---|
| **KAIROS Concierge** (A1) | `workspace_concierge` | Read-only front door. Answers workspace questions, analyzes projects, routes to other agents. |
| **Task Planner** (A2) | `task_planner` | Creates, updates, and manages task status via Draft → Confirm → Apply cycle. |
| **Notes Vault** (A3) | `notes_vault` | Creates, updates, and deletes sticky notes. Respects locked-note security. |
| **Events Publisher** (A4) | `events_publisher` | Manages public events: create, update, delete, RSVP, comments, likes. |

---

## Agent Tools

### A1 — KAIROS Concierge (Read-Only)

| Tool | Purpose |
|---|---|
| `getSessionContext` | Current user session (userId, email, name, org) |
| `listProjects` | User's projects (id, title, status) |
| `listTasks` | Tasks for a specific project |
| `getTaskDetail` | Single task details *(stub)* |
| `getProjectDetail` | Single project details *(stub)* |
| `listNotifications` | User notifications |
| `listOrganizations` | User orgs *(stub)* |
| `listEventsPublic` | Public events *(stub)* |

### A2 — Task Planner (Write via Draft)

| Tool | Purpose |
|---|---|
| `getSessionContext` | Session info |
| `getProjectDetail` | Project metadata + description |
| `listTasks` | Existing tasks (up to 50) |
| `getTaskDetail` | Single task |
| `createTask` | Insert new task (with `clientRequestId` dedup) |
| `updateTask` | Patch task fields |
| `updateTaskStatus` | Change task status (pending/in_progress/completed/blocked) |
| `deleteTask` | Remove task (requires `dangerous=true`) |

### A3 — Notes Vault (Write via Draft)

| Operation | Purpose |
|---|---|
| `create` | New sticky note with content |
| `update` | Modify note content (requires unlocked access for locked notes) |
| `delete` | Remove note (`dangerous=true`) |

### A4 — Events Publisher (Write via Draft)

| Operation | Purpose |
|---|---|
| `creates` | New event (title, description, date, region, RSVP toggle) |
| `updates` | Patch event fields |
| `deletes` | Remove event (owner-only) |
| `comments.add/remove` | Add/remove event comments |
| `rsvps` | Set RSVP status (going/maybe/not_going) |
| `likes` | Toggle event like |

---

## Communication Flow

```
┌─────────────────────────────────────────────────┐
│             User sends message                  │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│     Client-Side Intent Detection (fast)         │
│     (keyword matching, multilingual)            │
│                                                 │
│  Task keywords ──► A2 auto-pipeline             │
│  Note keywords ──► A3 draft (manual confirm)    │
│  Event keywords ─► A4 draft (manual confirm)    │
│  Default ────────► A1 Concierge                 │
└─────────────┬───────────────────────────────────┘
              │ (if routed to A1)
              ▼
┌─────────────────────────────────────────────────┐
│           A1 Workspace Concierge                │
│                                                 │
│  Reads context (projects, tasks, notifications) │
│  Produces JSON response:                        │
│                                                 │
│  intent.type = "answer"   → display to user     │
│  intent.type = "handoff"  → route to agent:     │
│    → task_planner   (auto-executes pipeline)    │
│    → notes_vault    (shows handoff message)     │
│    → events_publisher (shows handoff message)   │
│    → org_admin      (not yet implemented)       │
└─────────────────────────────────────────────────┘
```

---

## Draft → Confirm → Apply Lifecycle

All write agents (A2, A3, A4) follow the same 3-step pattern:

```
 ┌────────┐     ┌─────────┐     ┌────────┐
 │ DRAFT  │ ──► │ CONFIRM │ ──► │ APPLY  │
 └────────┘     └─────────┘     └────────┘
   LLM call      HMAC token      Execute DB
   produces       minted          writes
   plan JSON     (10-min TTL)
```

1. **Draft**: LLM generates a plan (creates, updates, statusChanges, deletes) based on context and user request. Plan is persisted in DB (A2/A3) or in-memory (A4).
2. **Confirm**: Server mints an HMAC-signed confirmation token (SHA-256, 10-minute TTL). Plan hash is verified to prevent tampering.
3. **Apply**: Token validated, plan executed against the database. Idempotent via `clientRequestId` for creates.

**Key difference**: A2 (tasks) auto-applies all 3 steps without user intervention. A3 (notes) and A4 (events) show Confirm/Apply buttons in the chat for manual approval.

---

## Security Guardrails

- **HMAC tokens**: Confirm tokens are signed with `AUTH_SECRET` + validated with `crypto.timingSafeEqual`
- **Plan hash**: SHA-256 hash prevents plan modification between confirm and apply
- **User ID checks**: Every stage verifies the request comes from the same user who created the draft
- **Idempotency**: Task creates use `clientRequestId` to prevent duplicates
- **Ownership enforcement**: Event deletes/updates filtered to owner-only events server-side
- **Locked notes**: A3 blocks updates/deletes on locked notes unless plaintext explicitly provided

---

## LLM Infrastructure

| Component | Details |
|---|---|
| **Model** | `Qwen/Qwen2.5-7B-Instruct` via HuggingFace Inference |
| **API** | OpenAI-compatible chat completion |
| **JSON mode** | `response_format: json_object` |
| **Timeout** | 60 seconds |
| **JSON repair** | Up to 2 LLM-assisted repair attempts for malformed JSON |
| **PDF extraction** | `pdfjs-dist`, max 10MB / 50 pages / 30K chars |

---

## Key Source Files

| File | Purpose |
|---|---|
| `src/server/agents/orchestrator/agentOrchestrator.ts` | Central brain — all draft/confirm/apply logic |
| `src/server/agents/prompts/a1Prompts.ts` | A1 system prompt |
| `src/server/agents/prompts/a2Prompts.ts` | A2 system prompt |
| `src/server/agents/prompts/a3Prompts.ts` | A3 system prompt |
| `src/server/agents/prompts/a4Prompts.ts` | A4 system prompt |
| `src/server/agents/context/a1ContextBuilder.ts` | A1 context loader (projects, tasks, notifications) |
| `src/server/agents/context/a2ContextBuilder.ts` | A2 context loader (project detail, existing tasks, collaborators) |
| `src/server/agents/context/a3ContextBuilder.ts` | A3 context loader (user notes, lock status) |
| `src/server/agents/context/a4ContextBuilder.ts` | A4 context loader (recent events, likes, comments) |
| `src/server/agents/tools/a1/readTools.ts` | A1 read-only tool implementations |
| `src/server/agents/llm/modelClient.ts` | LLM API client |
| `src/server/agents/llm/jsonRepair.ts` | JSON extraction and repair |
| `src/server/api/routers/agent.ts` | tRPC router exposing all agent endpoints |
| `src/components/projects/ProjectIntelligenceChat.tsx` | Unified chat UI (intent detect + all agent flows) |
| `src/components/chat/A1ChatWidgetOverlay.tsx` | Floating draggable chat widget |
