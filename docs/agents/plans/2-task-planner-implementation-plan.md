# Agent 2 (A2) — Task Planner: Precise Implementation Plan (Start → End)

This is the end-to-end, step-by-step implementation plan for **Agent 2: Task Planner** as described in [`docs/agents/2-task-planner.md`](docs/agents/2-task-planner.md:1), and designed to work **in sync** with **Agent 1: Workspace Concierge** ([`docs/agents/1-workspace-concierge.md`](docs/agents/1-workspace-concierge.md:1); implementation baseline in [`docs/agents/plans/1-workspace-concierge-implementation-plan.md`](docs/agents/plans/1-workspace-concierge-implementation-plan.md:1)).

> Goal: ship A2 as a **planning + backlog maintenance** agent that produces an auditable **TaskPlanDraft** and can apply approved changes (create/update/status-change/delete tasks) via the orchestrator’s **Draft → Confirm → Apply** pipeline.

---

## 0) Non-overlap contract with A1 (how they work together)

### 0.1 Responsibilities boundary (no overlap)

A1 (Workspace Concierge) owns:
- “Front door” conversational UX: interpret user intent across domains.
- Workspace situational awareness: read-only summaries across projects/tasks/events/notes/org.
- Routing/handoff: decides when a request is “task work” and hands off to A2.
- Producing “draft plans” that describe what should happen (but *not* applying task writes).

A2 (Task Planner) owns:
- Turning a goal into a **structured backlog plan** (creates/updates/status changes/deletes).
- Backlog maintenance operations: reprioritization, grooming, deduplication checks.
- Write execution (Apply phase) for task operations *only* — guarded by confirm tokens and tool allowlists.

Hard boundary rules:
- A1 never calls task write tools (and generally never generates executable `applyCalls`).
- A2 does not answer general workspace questions beyond what’s needed to plan tasks.
- A2 does not modify projects, org membership, notes, or events.

### 0.2 Sync protocol: A1 → A2 “handoff context”

A1 hands off to A2 using `handoff.context` in [`HandoffPlanSchema`](src/server/agents/schemas/a1WorkspaceConciergeSchemas.ts:15), with **minimal, typed** data:
- `projectId` (required for apply)
- optional filters: `goal`, `constraints`, `deadline`, `priorityBias`, `assigneePreference`, `keepExistingTasks` boolean
- optional “source material” pointers: `pdfDraftId` or `taskGenerationDraftId` (if A1 triggered task suggestions)

A2 treats handoff context as *untrusted input* and still:
- re-validates scope/authorization
- fetches latest tasks/collaborators
- asks user for missing scope if ambiguous

---

## 1) Definition of Done (DoD)

A2 is “done” when all items below are true:

1. A2 can produce a **TaskPlanDraft** (strict JSON) for:
   - creating new tasks
   - updating existing tasks
   - changing task status
   - optionally deleting tasks (guarded)
2. The server enforces **Draft → Confirm → Apply** for A2 mutations.
3. A2 “apply” is **idempotent** (re-applying the same plan does not duplicate tasks).
4. A2 never invents IDs; it only references task IDs fetched from tools.
5. All write operations go through existing tRPC/router logic (no bypass of auth checks), aligned with [`src/server/api/routers/task.ts`](src/server/api/routers/task.ts:1).
6. Every run is auditable (draft JSON + tool calls + apply mutation log + plan hash).

---

## 2) Establish the A2 contract (schemas + policies)

### 2.1 Create canonical A2 output schemas (Zod-first)

Create a dedicated schema module:
- **New file:** `src/server/agents/schemas/a2TaskPlannerSchemas.ts`

Schemas:

1) `TaskPrioritySchema`
- enum: `"low" | "medium" | "high" | "urgent"`

2) `TaskStatusSchema`
- mirror DB/task router enums (confirm in [`src/server/db/schema.ts`](src/server/db/schema.ts:1) + [`src/server/api/routers/task.ts`](src/server/api/routers/task.ts:1))
- example: `"todo" | "in_progress" | "blocked" | "done"` (use real values)

3) `TaskCreateDraftSchema`
- `title: string (1..256)`
- `description: string (<= 5000 default "")`
- `priority: TaskPrioritySchema`
- `assigneeId?: string` (or number; match your canonical user id type)
- `acceptanceCriteria: string[] (0..20 each <= 200 chars)`
- `orderIndex?: number int >= 0`
- `dueAt?: string (ISO) | null` (optional; if the platform supports due dates)
- `clientRequestId: string (required)`

4) `TaskUpdateDraftSchema`
- `taskId: number` (or string; match DB)
- `patch: { title?; description?; priority?; assigneeId?; orderIndex?; dueAt? }` (strict)
- `reason?: string`

5) `TaskStatusChangeDraftSchema`
- `taskId: number`
- `status: TaskStatusSchema`
- `reason?: string`

6) `TaskDeleteDraftSchema`
- `taskId: number`
- `reason: string`
- `dangerous: boolean` (must be `true` to allow deletion)

7) `TaskPlanDraftSchema`
- `agentId: "task_planner"`
- `scope: { orgId?: string|number; projectId: number }`
- `creates: TaskCreateDraft[]`
- `updates: TaskUpdateDraft[]`
- `statusChanges: TaskStatusChangeDraft[]`
- `deletes: TaskDeleteDraft[]`
- `orderingRationale?: string`
- `assigneeRationale?: string`
- `risks: string[]`
- `questionsForUser: string[]` (must be empty when scope is fully resolvable)
- `diffPreview: { creates: string[]; updates: string[]; statusChanges: string[]; deletes: string[] }` (human-readable summary)
- `planHash: string` (computed server-side; model may omit, server fills)

Strictness requirements:
- `.strict()` everywhere.
- No unknown keys.
- Enforce max sizes to control token/mutation blast radius.

Acceptance checks:
- Invalid/missing `clientRequestId` fails schema validation.
- Deletes require `dangerous=true` *and* confirm token in apply.

### 2.2 Define A2 tool allowlist policy (Draft vs Apply)

Draft allowlist (read tools):
- `getSessionContext`
- `getProjectDetail` (must include collaborators)
- `listTasks`
- `getTaskDetail`

Apply allowlist (write tools):
- `createTask`
- `updateTask`
- `updateTaskStatus`
- `deleteTask` (feature-flagged + explicit dangerous)

Acceptance checks:
- If model attempts write tools during draft, server rejects.
- If model attempts delete without `dangerous=true`, server rejects.

---

## 3) Agent profile (A2) + routing hooks

### 3.1 Add a profile definition for A2

Create:
- **New file:** `src/server/agents/profiles/a2TaskPlanner.ts`

Profile fields (mirror A1 profile shape in [`src/server/agents/profiles/a1WorkspaceConcierge.ts`](src/server/agents/profiles/a1WorkspaceConcierge.ts:4)):
- `id: "task_planner"`
- `name: "Task Planner"`
- `description`: planning/backlog maintenance + safe write execution
- `outputSchema`: `TaskPlanDraftSchema`
- `draftToolAllowlist`: A2 read tools
- `applyToolAllowlist`: A2 write tools

### 3.2 Extend orchestrator agentId union and profile selection

Update:
- [`AgentId`](src/server/agents/orchestrator/agentOrchestrator.ts:30) to include `"task_planner"`
- Profile selection logic in [`agentOrchestrator.draft()`](src/server/agents/orchestrator/agentOrchestrator.ts:73) to load A2 when requested

Non-overlap enforcement:
- Ensure A1’s draft endpoint still only accepts `workspace_concierge` (or add new endpoints for A2), and that A2 is invoked only when the UI/handoff chooses it.

---

## 4) A2 prompting: system prompt + planning heuristics

### 4.1 Create A2 prompt templates

Create:
- **New file:** `src/server/agents/prompts/a2Prompts.ts`

Include:

1) `getA2SystemPrompt(contextPack)`
- Identity: “KAIROS Task Planner”
- Mode: Draft vs Apply (system prompt indicates draft mode; apply handled by server, not the model)
- Hard rules:
  - JSON only
  - never invent IDs
  - do not delete unless user explicitly requests and `dangerous=true`
  - minimize tool usage
  - return `questionsForUser` if missing `projectId` or ambiguous goal

2) “Planning rubric” section
- Convert goals to tasks using:
  - decomposition (milestones → tasks)
  - dependency ordering
  - task sizing rules (1 task = 0.5–2 days of work, configurable)
  - acceptance criteria required for “build/feature” tasks

3) “Deduplication guidance”
- Use `listTasks` + simple similarity rules:
  - match normalized titles
  - avoid duplicates of existing tasks
  - prefer update/extend existing tasks instead of creating new ones

4) “DiffPreview construction”
- Produce short strings per change:
  - `+ [priority] Title (assignee?)`
  - `~ Task #123: priority high → urgent`
  - `✓ Task #123: todo → done`
  - `- Task #123: delete (reason)`

Acceptance checks:
- For a vague request, A2 returns questions (no creates/updates).
- For a specific request with scope, A2 returns a populated draft with a diff preview.

---

## 5) Context building for A2 (token-bounded, task-focused)

### 5.1 Implement `buildA2Context()`

Create:
- **New file:** `src/server/agents/context/a2ContextBuilder.ts`

Inputs:
- `ctx: TRPCContext`
- `scope: { orgId?: string|number; projectId?: number }`
- optional `handoffContext` from A1

Fetch:
- session context (userId, active org)
- project detail (title, description, collaborators)
- existing tasks (top N by recency + open status)
- optionally specific tasks referenced by user (if IDs present)

Hard caps:
- tasks: 50 max (match current task-generation behavior in [`agentOrchestrator.generateTaskDrafts()`](src/server/agents/orchestrator/agentOrchestrator.ts:136))
- collaborators: all for project (usually small)

Acceptance checks:
- If `projectId` missing, context builder returns a minimal pack and A2 asks user.

---

## 6) Tooling: implement A2 read/write tools as wrappers (security boundary)

### 6.1 Define a shared tool registry interface

If not already standardized beyond A1 tools, implement a common interface in:
- **New file:** `src/server/agents/tools/toolTypes.ts`

Shape:
- `name`
- `inputSchema`
- `outputSchema`
- `execute(ctx, input)`

Note: A1 has a tool list in [`src/server/agents/tools/a1/readTools.ts`](src/server/agents/tools/a1/readTools.ts:1). Reuse patterns but keep A2 tools separated.

### 6.2 Implement A2 tools

Create:
- `src/server/agents/tools/a2/readTools.ts`
- `src/server/agents/tools/a2/writeTools.ts`

Read tools:
- `getSessionContext`
- `getProjectDetail`
- `listTasks`
- `getTaskDetail`

Write tools (must call existing task router logic):
- `createTask`
- `updateTask`
- `updateTaskStatus`
- `deleteTask`

Implementation guidance:
- Do not execute direct Drizzle writes inside tools; call the same service/router used by UI.
- Enforce org/project authorization in each tool.
- Validate outputs (keep minimal, stable output shapes).

Acceptance checks:
- Tool allowlist enforcement rejects unregistered tool calls.
- Each mutation tool logs a sanitized mutation record.

---

## 7) Draft → Confirm → Apply pipeline for A2

### 7.1 Add new tRPC procedures for A2

Update router:
- [`agentRouter`](src/server/api/routers/agent.ts:10)

Add procedures (names can vary but should mirror lifecycle):

1) `agent.taskPlannerDraft`
- input: `{ message: string; scope?: { projectId?: number; orgId?: ... } }`
- output: `{ draftId: string; plan: TaskPlanDraft; rendered: { diffPreview: ...; questions: ... } }`

2) `agent.taskPlannerConfirm`
- input: `{ draftId: string }`
- output: `{ confirmationToken: string; summary: { creates: number; updates: number; statusChanges: number; deletes: number } }`

3) `agent.taskPlannerApply`
- input: `{ draftId: string; confirmationToken: string }`
- output: `{ applied: true; results: { createdTaskIds: number[]; updatedTaskIds: number[]; statusChangedTaskIds: number[]; deletedTaskIds: number[] } }`

Acceptance checks:
- All procedures are `protectedProcedure`.
- Apply fails without token.

### 7.2 Implement draft execution in orchestrator

Extend [`agentOrchestrator`](src/server/agents/orchestrator/agentOrchestrator.ts:69):
- `draftTaskPlan()` (A2 draft)

Flow:
1. Build A2 context pack.
2. Construct A2 system prompt.
3. Call LLM with `jsonMode: true`.
4. Parse+validate with repair loop (reuse [`parseAndValidate()`](src/server/agents/llm/jsonRepair.ts:1)).
5. Server fills/overrides:
   - `agentId = "task_planner"`
   - `scope.projectId` (from input)
   - `clientRequestId` defaults if model omitted (but schema should require it; better to fail fast)
   - `planHash` computed from normalized plan JSON.
6. Store draft in DB.

### 7.3 Confirm step

Implement confirm logic:
- fetch draft by `draftId`
- compute counts and “danger summary”
- mint `confirmationToken` with:
  - `draftId`
  - `planHash`
  - `expiresAt`
  - `userId`
  - `dangerousOps: boolean` if deletes present

### 7.4 Apply step

Apply logic:
1. Validate token (draftId, planHash, userId, expiry).
2. Re-run authorization checks against current project membership.
3. Execute mutations in safe order:
   - updates that prevent duplicates (optional)
   - creates
   - status changes
   - deletes last (only if `dangerous=true` and feature flag)
4. Idempotency:
   - `createTask` must include `clientRequestId` stored in DB and unique per project.
   - if an existing task already has that `clientRequestId`, skip and return existing id.
5. Persist apply log: tool calls, results, errors.

Acceptance checks:
- Re-applying the same plan does not create duplicates.
- Deletes are blocked unless both `dangerous=true` and feature flag enabled.

---

## 8) Persistence + audit trail (A2-specific)

### 8.1 Add DB tables/columns needed

If not present yet, add:
- `agentDrafts` table with:
  - `draftId` (pk)
  - `agentId`
  - `userId`
  - `orgId`
  - `scopeProjectId`
  - `draftJson`
  - `planHash`
  - `createdAt`
- `agentApplies` table with:
  - `applyId`
  - `draftId`
  - `userId`
  - `planHash`
  - `mutationsJson`
  - `createdAt`

Additionally for idempotency:
- Add `clientRequestId` column to `tasks` table (unique index on `(projectId, clientRequestId)`) if tasks do not already have it.

References:
- existing schema location: [`src/server/db/schema.ts`](src/server/db/schema.ts:1)
- migrations folder: [`src/server/db/migrations`](src/server/db/migrations:1)

Acceptance checks:
- Unique constraint prevents duplicates even under concurrent apply.

---

## 9) UI integration (minimal viable)

### 9.1 A2 entrypoints

1) From A1 handoff:
- If A1 output includes `handoff.targetAgent = "task_planner"`, UI shows “Open Task Planner” action pre-filled with scope.

2) Direct project UI:
- Add “Plan Tasks” button in project view (existing component reference: [`src/components/projects/ProjectManagement.tsx`](src/components/projects/ProjectManagement.tsx:1)).

### 9.2 Draft rendering + confirm modal

Render:
- DiffPreview list
- QuestionsForUser (if any) with an input box to refine
- Confirm button that calls confirm → returns token
- Apply button that calls apply

Safety UX:
- If deletes exist, show a red warning and require extra checkbox acknowledgement.

---

## 10) Testing plan (unit + integration)

### 10.1 Unit tests

- Schema strictness tests for `TaskPlanDraftSchema`.
- Plan hash determinism tests (same plan → same hash).
- Idempotency logic tests (same `clientRequestId` create called twice).
- Allowlist tests (draft cannot call write tools).

### 10.2 Integration tests

- `taskPlannerDraft` returns valid JSON for a known project.
- Confirm/apply flow rejects:
  - missing token
  - wrong user
  - expired token
  - planHash mismatch
- Apply produces expected task mutations through router logic.

---

## 11) Operationalization

### 11.1 Feature flags

- `TASK_PLANNER_DELETE_ENABLED=false` by default.
- `TASK_PLANNER_APPLY_ENABLED=true` behind internal rollout.

### 11.2 Observability

Log per run:
- agentId, userId, orgId, projectId
- tool calls list
- planHash
- counts of creates/updates/status/deletes
- latency and parse/repair stats

---

## 12) Release steps (start → end)

1. Implement A2 schemas + profile.
2. Implement A2 context builder.
3. Implement A2 draft prompt + draft orchestrator method.
4. Add persistence for drafts/applies + plan hash + confirmation tokens.
5. Implement write tool wrappers calling task router logic.
6. Add confirm/apply tRPC procedures.
7. Add UI entrypoints (handoff + project button) and confirm modal.
8. Add unit/integration tests; stub model client for CI.
9. Roll out behind feature flags; monitor apply logs and idempotency behavior.
