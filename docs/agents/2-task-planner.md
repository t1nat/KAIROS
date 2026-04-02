# A2 — Task Planner Agent (KAIROS)

## Purpose
Turn user goals into a structured task backlog and keep tasks accurate over time (priority, status, assignee, ordering). This is the main “planning” agent.

---

## Best-practice techniques applied (sourced)

### Tool calling is application-executed
OpenAI describes the flow: model returns tool calls, the application executes and returns tool outputs, then the model completes the response. Source: [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

### Human approval for risky/irreversible tools
n8n describes using HITL to require **Approve/Deny** on tools that modify or delete data. Source: [`docs.n8n.io/advanced-ai/human-in-the-loop-tools/`](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/).

### Keep tools small + obvious; validate arguments
OpenAI best practices emphasize clear schemas, enums, and making invalid states unrepresentable. Source: [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

---

## Responsibilities

1. **Plan generation**
- Create epics → tasks, with acceptance criteria.
- Propose assignees based on collaborators and org membership.

2. **Backlog maintenance**
- Reprioritize tasks.
- Convert “loose” ideas into actionable items.

3. **Progress workflows**
- Status changes (“todo” → “in_progress” → “done”).

---

## Inputs / Outputs

### Inputs
- User request
- Optional scope: `projectId`, `orgId`

### Draft output
- `TaskPlanDraft` (JSON):
  - proposed tasks
  - updates to existing tasks
  - ordering and rationale

### Apply output
- Execution summary + created/updated task IDs.

---

## Tool allowlist (Task Planner)

### Read tools (Draft allowed)
- `getSessionContext`
- `getProjectDetail` (includes collaborators/available users)
- `listTasks`
- `getTaskDetail`

### Write tools (Apply only)
- `createTask`
- `updateTask`
- `updateTaskStatus`
- `deleteTask` (default requires explicit “dangerous” flag + approval)

---

## Safety model

### Draft → Confirm → Apply
- Draft must include a **human-readable** diff representation.
- Confirm step shows:
  - N tasks to create
  - N tasks to update
  - N tasks to delete

### Idempotency
- If the same plan is applied twice, orchestrator must not duplicate tasks.
  - Use `clientRequestId` on each create (or a deterministic `externalId`) stored in DB.

### Constraint checks
- Ensure user has access to the project and write permission.
- Enforce allowed enums for status/priority.

---

## Zod schemas (conceptual)

### `TaskPlanDraft`
- `projectId`: number
- `creates`: array of `{ title; description; priority; assigneeId?; acceptanceCriteria: string[]; clientRequestId }`
- `updates`: array of `{ taskId; patch: { title?; description?; priority?; assigneeId? } }`
- `statusChanges`: array of `{ taskId; status }`
- `deletes`: array of `{ taskId; reason }`
- `risks`: string[]

### Tool schemas
- `createTaskInput`
- `updateTaskInput`
- `updateTaskStatusInput`

All enforced server-side with Zod.

---

## Prompting strategy (system prompt highlights)

- Always ask for missing scope if ambiguous:
  - “Which project should I apply this to?”
- Prefer minimal tool usage (load only relevant tools).
- Never invent IDs.

---

## Observability
- Store:
  - plan hash
  - tool call list
  - resulting task IDs
  - tRPC errors (sanitized)

---

## Repo integration points

Backend task logic lives under tRPC router:
- [`src/server/api/routers/task.ts`](src/server/api/routers/task.ts:1)

The agent write tools should call the same underlying logic (wrapped by orchestrator), not bypass access checks.
