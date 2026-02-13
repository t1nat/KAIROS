# A3 Notes Vault — Agent Response UX Plan (Draft → Confirm → Apply)

## Goal
When the user asks the agent to create/update/delete notes, the chat must show **exactly what will be written** before the user clicks **Confirm**.

Current issue: responses like “Created two new notes… Ops: 2” are too vague for HITL. The user needs a human-readable preview (and optionally structured details) of each proposed operation.

## Core UX Principle
**Draft step = preview. Confirm step = user acknowledgement. Apply step = execution result.**

The agent should not merely say “Ops: N”. It must present:
- What notes will be created/updated/deleted
- Titles (if applicable), targets (note id/name), and **full content preview** (or a safe excerpt)
- Any blocked operations and why

## Response Structure (Chat Message Layout)

### 1) Draft response (after user message)
**Tone/format:** clear, explicit, actionable.

**Template:**

1. **Acknowledgement**
   - “Okay — I can create X notes / update Y notes.”

2. **Preview of changes** (required)
   - Render one section per operation:
     - **Create**
       - Title/label (if available)
       - Content preview (full markdown if reasonable; otherwise first ~500–1000 chars with “show more”)
     - **Update**
       - Target: noteId + optional current title/excerpt
       - Diff-style preview if possible (optional)
       - New content preview
     - **Delete**
       - Target noteId + excerpt/title
       - Warning line: “This will permanently delete the note.”

3. **Blocked items** (if any)
   - “Blocked (N):”
   - Each blocked item includes reason and required user action.

4. **Confirmation prompt**
   - “If this looks right, click Confirm to lock this plan, then Apply to execute.”

**Example (Draft):**

> Okay — I’m ready to create 2 notes.
>
> **1) Create note**
> - Content:
>   ```md
>   # Important date: Feb 20
>   - …
>   ```
>
> **2) Create note**
> - Content:
>   ```md
>   # Important date: Mar 02
>   - …
>   ```
>
> Click **Confirm** to proceed.


### 2) Confirm response (after clicking Confirm)
**Goal:** show a concise acknowledgement that the plan is locked + still provide the preview context.

**Template:**
- “Confirmed. This plan is locked for 10 minutes.”
- Summary counts
- Optionally repeat a condensed preview list (titles/first line of content)
- Show **Apply** button

**If already confirmed:**
- “Already confirmed. Click Apply to execute.” (no error)

### 3) Apply response (after clicking Apply)
**Goal:** show what happened.

**Template:**
- “Applied.”
- Results list:
  - Created note IDs
  - Updated note IDs
  - Deleted note IDs
  - Blocked note IDs (and why)

## Data Requirements (what A3 must return)

The backend already returns `plan` in draft. The UI must render details from it.

### Minimum required fields per operation
- Create:
  - `content` (markdown string)
- Update:
  - `noteId`
  - `content` (new markdown)
  - `requiresUnlocked` (boolean)
- Delete:
  - `noteId`

### Recommended additions (future-safe)
If we want better previews without guessing:
- Add optional `title` to operations (derived by model or extracted from markdown)
- Add optional `preview` field (first N chars) computed server-side
- Add optional `reason` for each operation (why it’s being made)

## UI Implementation Plan (ProjectIntelligenceChat)

### Draft rendering
- When `notesVaultDraft` returns `{ draftId, plan }`, render an agent message with:
  - Human sentence: “Okay — I’m ready to create X / update Y / delete Z.”
  - A rendered list of operations:
    - Use a `pre` / code block style for markdown content.
    - Show collapsible blocks if content is long.
  - Confirm button

### Confirm rendering
- On confirm success, render:
  - “Confirmed. Summary: …”
  - Apply button

### Apply rendering
- Render execution results clearly.

## Safety / Policy Constraints
- Never request the user’s PIN/password.
- For locked notes:
  - Draft can propose updates but must set `requiresUnlocked=true`.
  - UI should show: “Blocked until unlocked content is provided.”

## Acceptance Criteria
- For any “create note” request, the draft response shows **exact note content** before Confirm.
- Confirm never throws when clicked twice; it becomes idempotent.
- Apply executes only the confirmed plan.
- Locked-note updates are explicitly flagged as requiring unlocked content.

## Notes
This is a UX plan only. It does not change the underlying A3 schema requirements, but it requires the UI to render the existing `plan.operations[]` fields rather than only counts.
