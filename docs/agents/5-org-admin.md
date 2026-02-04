# A5 — Collaboration & Org Admin Agent (KAIROS)

## Purpose
Handle organization membership, roles/capabilities, and collaboration permissions, with strong safeguards.

---

## Best-practice techniques applied (sourced)

### HITL approvals for high-impact actions
n8n emphasizes human approval for high-impact tools (modifying records, deleting). Org changes are high-impact, so **always require approval**. Source: [`docs.n8n.io/advanced-ai/human-in-the-loop-tools/`](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/).

### Function schemas should make invalid states unrepresentable
OpenAI recommends enums and structured objects to prevent invalid calls. Source: [`platform.openai.com/docs/guides/function-calling`](https://platform.openai.com/docs/guides/function-calling).

### Security boundary mindset
NVIDIA recommends deny-by-default around risky actions. For org admin:
- strict allowlist
- no bulk destructive operations without explicit user confirmation.
Source: NVIDIA blog [`developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/`](https://developer.nvidia.com/blog/practical-security-guidance-for-sandboxing-agentic-workflows-and-managing-execution-risk/).

---

## Responsibilities

1. Membership workflows
- Join org by access code
- Invite/add member (if supported)
- Remove member

2. Roles/capabilities
- Propose role changes with explanation
- Enforce least-privilege suggestions

3. Project collaboration
- Add/remove collaborators; set read/write permissions

---

## Tool allowlist (Org Admin)

### Read tools (Draft allowed)
- `listOrganizations`
- `getOrganizationDetail` (members + capabilities)
- `getProjectDetail` (collaborators)
- `searchUsersByEmail`

### Write tools (Apply only)
- `createOrganization`
- `joinOrganizationByAccessCode`
- `inviteOrgMember`
- `updateOrgMemberRoleOrCapabilities`
- `removeOrgMember`
- `addProjectCollaborator`
- `removeProjectCollaborator`

---

## Safety model

### Mandatory approval
All write tools require explicit approval, even if “low risk”, because permission edits can have long tail consequences.

### Diff-first
Draft must show:
- current role/caps → proposed role/caps
- collaborators before/after

### No implicit privilege escalation
Agent must never propose granting itself/another user admin without explicit user request.

---

## Zod schemas (conceptual)

### `OrgChangeDraft`
- `orgId`
- `memberRoleChanges`: array of `{ userId; fromRole; toRole; rationale }`
- `capabilityChanges`: array
- `collaboratorChanges`: array

All enums must match DB role enums.

---

## Repo integration

Org router:
- [`src/server/api/routers/organization.ts`](src/server/api/routers/organization.ts:1)

Project collaborator flows appear in:
- [`src/components/projects/ProjectManagement.tsx`](src/components/projects/ProjectManagement.tsx:599)

This agent’s write tools should call the orchestrator wrappers that re-use the router’s permission checks.
