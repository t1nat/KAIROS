# KAIROS AI Agents — How They Work

## What Are the Agents?

KAIROS uses a **multi-agent AI system** — a set of five specialized AI agents, each responsible for a single domain within the platform. Instead of one monolithic chatbot that tries to do everything, KAIROS splits the work across focused agents that know their own domain deeply and refuse to act outside of it.

| Agent | ID | Domain | Status |
|-------|----|--------|--------|
| **A1** Workspace Concierge | `workspace_concierge` | Navigation, Q&A, routing | Implemented |
| **A2** Task Planner | `task_planner` | Task creation and management | Implemented |
| **A3** Notes Vault | `notes_vault` | Sticky notes with lock protection | Implemented |
| **A4** Events Publisher | `events_publisher` | Event creation and moderation | Planned |
| **A5** Org Admin | `org_admin` | Organization membership and roles | Planned |

All five agents share the same lifecycle, the same orchestrator, and the same safety guarantees. The user never has to pick which agent to talk to — routing is automatic.

---

## The Big Picture

The entire system is held together by three layers:

1. **A unified chat interface** — one chat window the user types into (full-page at `/chat` or a floating widget).
2. **A central orchestrator** — a server-side module that coordinates every agent, enforces rules, and manages the draft/confirm/apply lifecycle.
3. **The agents themselves** — LLM personas with strict tool allowlists, scoped prompts, and JSON-only output.

```
User message
     │
     ▼
┌──────────────────────────┐
│   Unified Chat Interface │
│   (client-side routing)  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│   Agent Orchestrator     │
│   (server-side routing,  │
│    context loading,      │
│    LLM calls, validation)│
└──┬─────┬─────┬─────┬────┘
   │     │     │     │
   ▼     ▼     ▼     ▼
  A1    A2    A3   A4/A5
```

---

## What Each Agent Does

### A1 — Workspace Concierge (The Front Door)

A1 is the entry point. Every message hits A1 first (unless keyword detection on the client side sends it to A3 directly for notes-related requests).

**What it does:**
- Answers questions about the workspace — projects, tasks, notifications, orgs, events.
- Summarizes project progress and identifies risks (overdue tasks, unassigned items, unclear descriptions).
- Suggests concrete next actions (3–7 prioritized steps).
- Routes requests to other agents when the user's intent requires writes.

**What it cannot do:**
- Write anything to the database. A1 is strictly **read-only**. It has 8 read tools and zero write tools.

**How routing works:**
When A1 detects the user wants to change something (create tasks, edit notes, manage events, modify org membership), it produces a structured `handoff` object that sends the request to the right agent:

| User intent | Routed to |
|-------------|-----------|
| Create/update/delete tasks | A2 — Task Planner |
| Create/update/delete notes, summarize notes | A3 — Notes Vault |
| Create/manage events | A4 — Events Publisher |
| Org membership, roles, permissions | A5 — Org Admin |

---

### A2 — Task Planner (The Planner)

A2 turns natural language goals into structured task backlogs.

**What it does:**
- Decomposes goals into epics, stages, and individual tasks.
- Creates up to 30 new tasks at once, each with title, description, priority, and acceptance criteria.
- Updates up to 50 existing tasks (reprioritize, reassign, edit descriptions).
- Changes task statuses in bulk (todo → in_progress → done).
- Deletes tasks (max 10, only on explicit request, flagged as dangerous).
- Deduplicates — prefers updating an existing task over creating a duplicate.
- Extracts tasks from uploaded PDF files (assignments, specs, reports) using a two-step pipeline: PDF text extraction → AI task generation.

**What it cannot do:**
- Access notes, events, or org settings. Its tools are scoped to tasks only.

---

### A3 — Notes Vault (The Secure Note Manager)

A3 manages sticky notes with strict respect for KAIROS's note-locking system.

**What it does:**
- Creates, updates, and deletes notes.
- Summarizes and organizes the user's notes.
- Handles the full draft/confirm/apply lifecycle inline in the chat.

**What makes it special:**
- **Locked notes are invisible to the AI.** The content of a locked note is never sent to the LLM. If the user asks to edit a locked note, A3 responds: "Unlock the note in the UI first."
- The agent never asks for, stores, or processes passwords or PINs.
- Even if the LLM hallucinates an operation on a locked note, the orchestrator blocks it server-side.

---

### A4 — Events Publisher (Planned)

A4 will handle event creation and moderation through natural language. It will extract structured event data (title, date, region, description, reminders) from user prompts, support comment moderation, and integrate with the existing `EventReminderService` and `RegionMapPicker`. Routing from A1 is already wired (`events_ops → events_publisher`).

### A5 — Org Admin (Planned)

A5 will manage organization membership, role changes, capability assignments, and project-level collaboration permissions. Every write operation will require explicit confirmation due to the long-tail consequences of permission changes. Routing from A1 is already wired (`membership_ops → org_admin`).

---

## How Agents Work Together

The agents are not isolated silos — they form a coordinated pipeline connected through A1 and the orchestrator.

### Routing Chain

The typical flow when agents collaborate:

```
1. User sends: "Break down Project Alpha into tasks and note the key risks"
                     │
                     ▼
2. A1 (Concierge) reads project data, identifies the intent involves
   both task creation and note creation
                     │
                     ▼
3. A1 produces a handoff → A2 (Task Planner)
   with context: { projectId, userIntent: "decompose into tasks" }
                     │
                     ▼
4. A2 reads the project and existing tasks, generates a TaskPlanDraft
   (e.g., 12 new tasks with priorities and acceptance criteria)
                     │
                     ▼
5. User reviews and confirms → tasks are applied to the database
                     │
                     ▼
6. If the user then says "save the risk summary as a note",
   client-side routing sends this to A3 (Notes Vault)
                     │
                     ▼
7. A3 creates a NotesDraftPlan with the risk content → user confirms → applied
```

### What "Parallel" Means Here

The agents do not literally run simultaneously on separate threads. Instead, they work **in parallel at the domain level** — each agent independently owns its domain, and the orchestrator can coordinate multi-domain requests by sequencing handoffs:

- **Domain isolation:** A2 owns tasks, A3 owns notes, A4 owns events, A5 owns orgs. There is no overlap. This means one agent never blocks another from working on its own domain.
- **Concurrent scoping:** The orchestrator loads context for each agent independently. A2 pulls task data; A3 pulls note metadata. They don't share state or compete for resources.
- **Pipeline parallelism:** In a conversation, the user can fire a task planning request, confirm it, and immediately ask a notes question — the agents handle these as independent operations through the same chat interface without conflicts.
- **Independent lifecycles:** Each agent's draft/confirm/apply cycle runs independently. You can have an A2 draft pending confirmation while starting a new A3 draft. They don't interfere.

### The Orchestrator as the Coordinator

The orchestrator is the central nervous system. Every agent call flows through it:

```
                    ┌──────────────────────────┐
                    │      ORCHESTRATOR         │
                    │                           │
  User message ───▶│  1. Load session context   │
                    │  2. Select agent profile   │
                    │  3. Build context pack     │
                    │  4. Call LLM (JSON mode)   │
                    │  5. Validate with Zod      │
                    │  6. Auto-repair if needed  │
                    │  7. Return draft to user   │
                    │                           │
  User confirms ──▶│  8. Generate confirm token │
                    │     (SHA-256 plan hash,    │
                    │      10-min expiry)        │
                    │                           │
  User applies ───▶│  9. Re-verify hash + user  │
                    │ 10. Execute write tools    │
                    │ 11. Log to audit table     │
                    │ 12. Return results         │
                    └──────────────────────────┘
```

The orchestrator guarantees:
- **Agent cannot escape its tool allowlist.** A1 can never write; A2 can never touch notes.
- **No write happens without confirmation.** The draft/confirm/apply lifecycle is enforced server-side.
- **Plan integrity.** The SHA-256 hash of the confirmed plan must match at apply time — no tampering.
- **Audit trail.** Every draft, confirmation, and apply is logged with user ID, plan hash, tool calls, and results.

---

## The Draft → Confirm → Apply Lifecycle

This is the core safety mechanism shared by all agents that perform writes (A2, A3, A4, A5). A1 is read-only and skips this.

### Phase 1: Draft

The agent reads context from the database using its read tools and generates a structured plan (JSON only). Nothing is written. The plan includes:
- Proposed creates, updates, status changes, deletes
- A human-readable diff preview
- Identified risks and questions for the user

### Phase 2: Confirm

The user reviews the proposed changes in the chat UI and clicks "Confirm." The orchestrator:
- Validates the draft exists and belongs to the user
- Generates a confirmation token (Base64 JSON containing userId, draftId, SHA-256 plan hash, and a 10-minute expiry)
- Marks the draft as "confirmed"

### Phase 3: Apply

The user clicks "Apply" with the token. The orchestrator:
- Decodes and verifies the token (user match, draft exists, hash matches, not expired)
- Executes the write operations against the database
- Logs everything to the audit table
- Marks the draft as "applied"

```
  DRAFT              CONFIRM             APPLY
  ─────              ───────             ─────
  AI generates  ──▶  User reviews   ──▶  System executes
  a plan             and approves        the operations
  (read-only)        (token issued)      (writes to DB)
```

If the plan is tampered with between confirm and apply, the hash check fails and apply is rejected.

---

## How the Agents Share the Chat

From the user's perspective, there is **one chat**. Behind the scenes:

1. **Client-side keyword routing** — if the message contains note-related keywords (`note`, `notes`, `sticky`, `vault`, `summarize my notes`), it goes straight to A3.
2. **Everything else goes to A1** — which either answers directly (read-only questions) or hands off to A2/A3/A4/A5.
3. **Handoff is seamless** — the user doesn't see agent switches. The response simply comes back with the right agent's output formatted in the chat.

The chat supports two context modes:
- **Global** — answers about the entire workspace (all projects, tasks, notifications).
- **Project-scoped** — when opened inside a project, loads only that project's data for more focused responses.

---

## Tool System

Agents interact with the database exclusively through **tools** — server-side functions exposed by the orchestrator. Tools are split into two categories:

### Read Tools (usable during Draft phase)
| Tool | Used by | Purpose |
|------|---------|---------|
| `getSessionContext` | A1, A2 | Current user session info |
| `listProjects` | A1 | List user's projects |
| `getProjectDetail` | A1, A2 | Project details + collaborators |
| `listTasks` | A1, A2 | Tasks filtered by project/status/priority |
| `getTaskDetail` | A1, A2 | Single task details |
| `listOrganizations` | A1 | User's orgs and roles |
| `listNotifications` | A1 | Recent notifications |
| `listEventsPublic` | A1 | Public events feed |
| `listNotesMetadata` | A3 | Note metadata (no locked content) |
| `getNoteContentIfUnlocked` | A3 | Note content only if unlocked |

### Write Tools (usable only during Apply phase, after confirmation)
| Tool | Used by | Purpose |
|------|---------|---------|
| `createTask` | A2 | Create a new task |
| `updateTask` | A2 | Update task fields |
| `updateTaskStatus` | A2 | Change task status |
| `deleteTask` | A2 | Delete a task (dangerous) |
| `createNote` | A3 | Create a new note |
| `updateNote` | A3 | Update note (only if unlocked) |
| `deleteNote` | A3 | Delete a note (dangerous) |

No agent can call a tool outside its allowlist. The orchestrator enforces this server-side.

---

## Safety and Guardrails

### Scope Guard
Every agent only answers questions related to KAIROS. Off-topic requests (weather, coding help, recipes) are politely declined with examples of what the agent *can* help with.

### JSON-Only Output
All agent responses are strict JSON. Output goes through:
1. JSON parsing
2. Zod schema validation
3. Up to 2 AI-assisted auto-repair attempts if validation fails

### Locked Note Protection (Three Layers)
1. **Prompt level** — A3 is instructed to never ask for passwords.
2. **Context level** — locked note content is never sent to the LLM.
3. **Orchestrator level** — operations on locked notes are blocked server-side.

### Prompt Injection Defense
System prompts include explicit instructions to ignore content that looks like prompt injection attempts.

### Idempotency
Each create operation carries a `clientRequestId` to prevent duplicate records if the same plan is applied twice.

### Cryptographic Plan Integrity
SHA-256 hashing ensures the plan confirmed by the user is exactly the plan that gets applied.

---

## Infrastructure

### Models
KAIROS uses open-source models via HuggingFace Inference Providers — no vendor lock-in:

| Model | Role |
|-------|------|
| Qwen/Qwen2.5-7B-Instruct (128K context) | Primary model |
| microsoft/Phi-3.5-mini-instruct | Fallback model |
| deepseek-ai/DeepSeek-R1 | Optional reasoning model |

### Technical Parameters
- Temperature: 0.2 (low, for predictable output)
- Max tokens: 4096
- Timeout: 60 seconds
- JSON mode enabled via `response_format: { type: "json_object" }`
- No SDK dependency — plain `fetch` calls

### Server-Side File Structure
All agent code lives in `src/server/agents/`:

| Directory | What it contains |
|-----------|-----------------|
| `orchestrator/` | Central orchestrator — coordinates all lifecycle phases |
| `llm/` | LLM client and JSON validation with auto-repair |
| `profiles/` | Agent profiles — identity, allowed tools, routing rules |
| `prompts/` | System prompts — instructions, constraints, output schemas |
| `schemas/` | Zod schemas for input/output validation |
| `context/` | Context builders — load relevant data from the database |
| `tools/` | Read and write tool implementations |
| `pdf/` | PDF text extraction module |

---

## Summary

The KAIROS agent system is a **router-orchestrator-agent** architecture where:

- **One chat interface** serves as the single entry point for all AI interactions.
- **A1 (Concierge)** acts as the read-only front door that answers questions and routes write requests.
- **A2 (Task Planner)** and **A3 (Notes Vault)** handle domain-specific writes through the draft/confirm/apply lifecycle.
- **A4** and **A5** are planned to extend the same pattern to events and org management.
- **The orchestrator** enforces tool allowlists, manages the confirmation lifecycle, validates all output with Zod, and maintains a complete audit trail.
- Agents work **in parallel at the domain level** — each owns its domain independently, their lifecycles don't interfere, and the user can interact with multiple agents sequentially through the same chat without conflicts.
- **Nothing is written without the user's explicit approval.** Every write goes through Draft → Confirm → Apply with cryptographic integrity checks.
