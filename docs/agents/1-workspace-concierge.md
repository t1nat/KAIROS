# A1 — Workspace Concierge Agent (KAIROS)

## Purpose
A generalist “front door” agent that answers workspace questions and routes to domain-specific actions across **projects, tasks, orgs, notifications, events**, without performing side effects until explicitly approved.

This agent is optimized for:
- **Situational awareness** (what’s happening, what needs attention)
- **Query → synthesis** (turn raw lists into useful summaries)
- **Safe delegation** (draft plans only; write actions always go through orchestrator approval)

### Primary UI entrypoints
- Global agent UI (recommended): command palette or assistant panel.
- Secondary: inside chat UI (but keep it workspace-scoped).

---

## Best-practice techniques applied (sourced)

1) Tool calling with clear schemas and server-side execution
- OpenAI describes tool calling as a multi-step flow where the application executes tools and feeds results back to the model (tool-call → app execution → tool output → final model response). Source: OpenAI Function Calling guide [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

2) Human-in-the-loop for risky actions
- n8n describes pausing a workflow for **Approve / Deny** before executing higher-risk tools. Source: n8n HITL docs [`docs.n8n.io/advanced-ai/human-in-the-loop-tools/`](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/).

3) Treat tool interfaces as security boundaries
- NVIDIA Red Team guidance recommends deny-by-default patterns like restricting network egress and blocking unsafe writes; while KAIROS isn’t a code-execution agent, the same concept applies: **restrict tool capabilities** and avoid exposing secrets. Source: NVIDIA sandboxing guidance [`developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/`](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/).

---

## Agent operating contract

### Inputs
- User message
- Session context (userId, active org)
- Optional scope hints (current projectId / page)

### Outputs (JSON-only internally; rendered to user)
- `Answer`: for purely informational requests.
- `ActionPlanDraft`: when user intent implies changes.

### Phase rules
- Draft: may call **read tools only**.
- Apply: orchestrator executes **write tools** only after approval.

---

## Tool allowlist for Workspace Concierge

### Read tools (Draft allowed)
- `getSessionContext`
- `listProjects`
- `getProjectDetail`
- `listTasks`
- `getTaskDetail`
- `listOrganizations`
- `listNotifications`
- `listEventsPublic`

### Write tools (Apply only; typically delegated)
Workspace Concierge should rarely propose direct writes; it should prefer to hand off to the specialized agent.
- `createTask`, `updateTask`, `updateTaskStatus`
- `createProject`, `addProjectCollaborator`
- `createEvent`

### Tool minimization rule
Per OpenAI best practice “keep number of functions small for higher accuracy”, only load tools relevant to the current intent. Source: OpenAI function best practices section [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

---

## Decision policy (routing)

### When to route
- If user asks to modify tasks → route to Task Planner.
- Modify notes / summarize notes → route to Notes Vault.
- Create/moderate events → route to Events Publisher.
- Membership/capabilities/collaborators → route to Org Admin.

### How routing works
- Concierge produces a draft `handoff` plan:
  - `targetAgent`: enum
  - `context`: structured minimal context (ids, filters)
  - `userIntent`: summarized

---

## Zod schemas (conceptual)

### `ConciergeIntent`
- `type`: `"answer" | "handoff" | "draft_plan"`
- `scope`: `{ projectId?: number; orgId?: number }`

### `HandoffPlan`
- `targetAgent`: `"task_planner" | "notes_vault" | "events_publisher" | "org_admin"`
- `context`: object

### `ActionPlanDraft`
- `readQueries`: array of `{ tool, input }`
- `proposedChanges`: array of `{ summary, affectedEntities }`
- `applyCalls`: array of `{ tool, input }` (empty for Concierge by default)

---

## Observability + audit
- Every draft run stored with:
  - `promptHash`, `model`, `toolsetId`, `planHash`
- Every apply run stored with:
  - confirmed `planHash`, tool call logs, db mutation ids.

---

## Failure handling
- Validation failures: orchestrator returns “schema error” and requests a new draft.
- Partial data: agent must explain uncertainty and request narrower scope.

---

## Security notes
- No secrets in prompts. If any env-based secret is required for downstream tools, use **secret injection** patterns (conceptually aligned with NVIDIA guidance). Source: NVIDIA blog above.

---

## Implementation steps (repo-specific)

1. Add orchestrator endpoint(s): `POST /api/agent/draft`, `POST /api/agent/confirm`, `POST /api/agent/apply`.
2. Implement read tools via existing tRPC query logic (server-side wrappers).
3. Add `workspace_concierge` agent profile:
   - system prompt
   - tool allowlist
   - output schema.

Relevant repo APIs for context:
- tRPC handler: [`src/app/api/trpc/[trpc]/route.ts`](src/app/api/trpc/[trpc]/route.ts:1)
- Events entry: [`src/app/publish/page.tsx`](src/app/publish/page.tsx:1)
