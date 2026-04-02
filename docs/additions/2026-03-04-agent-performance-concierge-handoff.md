# Session Summary — Concierge privacy + Task Planner handoff UX

Date: 2026-03-04

## Goals addressed
- Make the concierge respond more intuitively and avoid exposing workspace/project information unless explicitly asked.
- Improve Task Planner handoff UX so task requests clearly show a planner “thinking…” phase and then finish with a concise done message.
- Run tests after changes and ensure the suite passes.

## Code changes

### 1) Concierge: privacy-first + less intrusive fallbacks

- Updated the concierge system prompt to default to non-disclosure:
  - Do **not** proactively reveal workspace/project/task lists, counts, IDs, titles, or names.
  - Only use workspace/project data when the user explicitly asks, or it’s required to answer.

  File: [`src/server/agents/prompts/a1Prompts.ts`](src/server/agents/prompts/a1Prompts.ts:13)

- Updated the A1 fallback response so it no longer dumps workspace stats/projects when the LLM is unavailable.
  - New fallback is neutral and action-guiding (rephrase; or explicitly ask to create tasks to handoff).

  File: [`src/server/agents/orchestrator/agentOrchestrator.ts`](src/server/agents/orchestrator/agentOrchestrator.ts:1374)

### 2) Project chat UI: Task Planner handoff + “thinking…” indicator + deterministic optimistic UI

- Task intent path now:
  - Immediately shows the handoff message (translation key `handoffTaskPlanner`).
  - Immediately shows a **sub-agent working** indicator (SUBAGENT sentinel) as the “thinking…” phase.
  - Runs the planner pipeline and replaces the sentinel with the final done text (and inline task preview when available).

- A1 non-task messages:
  - `handleSend()` owns optimistic UI for user message + thinking sentinel, rather than `onMutate()`.
  - This prevents duplicated bubbles and makes tests deterministic.

- Greeting detection tightened:
  - Reduced max word threshold for the greeting fast-path to avoid treating “hi …” sentences as greetings.

- Layout alignment for tests:
  - Message container spacing updated to match the layout expectation (`w-full space-y-4`).

  File: [`src/components/projects/ProjectIntelligenceChat.tsx`](src/components/projects/ProjectIntelligenceChat.tsx:570)

## Tests executed
- Full suite executed successfully:
  - `pnpm test`
  - Result: 31 test files / 625 tests passing.

## Notes / Follow-ups
- Orchestrator-side “choose best agent per request” routing is still marked as pending in the reminders; current behavior relies mainly on UI intent detection + A1 prompt handoff rules.
