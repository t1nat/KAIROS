# KAIROS CRM (B2B Sales) — Research, Product Spec, and Architecture Options

> **Scope**: This document proposes a CRM module tailored to KAIROS, a Next.js + tRPC + Postgres/Drizzle platform with organizations/workspaces, tasks, calendar/events, notes, notifications, AI agents, and real-time (Socket.IO + Redis pub/sub). It is a **research + product/architecture specification** only. No implementation.
>
> **Target users**: B2B sales reps and sales managers.
>
> **Core CRM domains**: accounts/contacts, leads, deal pipeline, activities, forecasting.

---

## Contents

1. [Why CRM inside KAIROS (fit + differentiation)](#why-crm-inside-kairos-fit--differentiation)
2. [Guiding principles (MVP quality bar)](#guiding-principles-mvp-quality-bar)
3. [Capabilities matrix (MVP → V1 → V2)](#capabilities-matrix-mvp--v1--v2)
4. [Core entities & data model](#core-entities--data-model)
   - 4.1 [Entity overview](#41-entity-overview)
   - 4.2 [Relationships](#42-relationships)
   - 4.3 [Field-level details (recommended)](#43-field-level-details-recommended)
   - 4.4 [Timeline/audit model](#44-timelineaudit-model)
5. [Key workflows](#key-workflows)
   - 5.1 [Lead capture & qualification](#51-lead-capture--qualification)
   - 5.2 [Deal progression (pipeline)](#52-deal-progression-pipeline)
   - 5.3 [Activity logging & follow-ups](#53-activity-logging--follow-ups)
   - 5.4 [Meetings & scheduling](#54-meetings--scheduling)
   - 5.5 [Forecasting & rollups](#55-forecasting--rollups)
   - 5.6 [Discounts, approvals, and quote flow](#56-discounts-approvals-and-quote-flow)
6. [Permissions & roles aligned with KAIROS org model](#permissions--roles-aligned-with-kairos-org-model)
7. [Integrations](#integrations)
8. [AI agent roles (leveraging KAIROS A1–A5 patterns)](#ai-agent-roles-leveraging-kairos-a1a5-patterns)
9. [Architecture options & storage considerations](#architecture-options--storage-considerations)
10. [Reporting/analytics/forecasting approaches](#reportinganalyticsforecasting-approaches)
11. [Risks & compliance (GDPR, security, trust)](#risks--compliance-gdpr-security-trust)
12. [Roadmap (milestones + dependencies)](#roadmap-milestones--dependencies)
13. [Appendix: Glossary and conventions](#appendix-glossary-and-conventions)

---

## Why CRM inside KAIROS (fit + differentiation)

KAIROS already has key primitives that map cleanly to CRM:

- **Organizations/workspaces & role/permission model** → multi-tenant sales orgs, teams, territories.
- **Tasks + progress timelines** → follow-up tasks, next steps, activity-driven selling.
- **Calendar/events** → meetings, reminders, sequences.
- **Notes vault** → account research notes, call notes (with optional “locked note” semantics for sensitive content).
- **Notifications + real-time** → deal changes, mentions, task assignments, approval requests.
- **Agent orchestrator** (draft → confirm → apply) → safe automation for CRM updates and outreach drafting.

Differentiation opportunities:

1. **Activity-first CRM**: unify tasks/events/notes into an Account/Deal timeline with strong “next steps” UX.
2. **Agent-assisted hygiene**: AI helps keep data complete and current (missing contacts, stale deals, no next activity).
3. **Opinionated forecasting**: define explicit forecast rules and manager overrides, with auditability.

---

## Guiding principles (MVP quality bar)

1. **Single source of truth**: core CRM records are relational and permissioned; derived views are cached.
2. **Timeline is a first-class citizen**: every meaningful change is reflected on an entity timeline.
3. **Sales hygiene by design**: enforce “next activity” + stage exit criteria to reduce stale pipeline.
4. **Composable with existing KAIROS**: reuse tasks/events/notes/notifications rather than duplicating.
5. **Safety and audit**: agent-initiated changes follow Draft → Confirm → Apply and are logged.

---

## Capabilities matrix (MVP → V1 → V2)

Legend:
- **MVP**: minimal viable CRM for real selling motions.
- **V1**: feature-complete for SMB/mid-market teams.
- **V2**: advanced enterprise-like capabilities.

| Area | MVP | V1 | V2 |
|---|---|---|---|
| Accounts & Contacts | Accounts, contacts, basic segmentation, duplicate detection (soft) | Account hierarchies, contact roles, buying committee | Multi-entity graph (subsidiaries), relationship intelligence |
| Leads | Manual lead creation/import CSV, status lifecycle | Web-to-lead form endpoint, enrichment hooks | Multi-source lead routing, scoring models |
| Deals | Deals with pipeline stages, value, close date, owner | Multiple pipelines per org, stage probability models | Complex deal types, multi-currency, products/bundles |
| Activities | Log calls/emails/meetings/notes as activities; link to account/contact/deal | Activity sequences, templates, suggested next actions | Conversation intelligence summaries, auto-logging from integrations |
| Tasks & Follow-ups | Create follow-up tasks from deal/account; “next activity date” | SLA rules (e.g., respond in 24h), auto reminders | Advanced playbooks, sequence step execution |
| Calendar | Link meetings to deals; reminders; attendee tracking | Two-way calendar sync; scheduling links | Room/resource scheduling, meeting insights |
| Notes | Account/deal notes; optional lock for sensitive notes | Note templates per stage; collaborative notes | Knowledge base + RAG, governance |
| Forecasting | Basic pipeline forecast (weighted by stage probability); manager view by team | Forecast categories (Commit/Best Case/Pipeline/Omitted); rollups | Forecast scenarios, quota pacing, seasonality models |
| Approvals | Manual “request approval” activity + notification | Discount/exception approvals with policy rules | Multi-step approvals, delegation, audit-ready exports |
| Permissions | Org roles (rep/manager/admin); record ownership | Team-based visibility, territory-based rules | Field-level security, data residency controls |
| Integrations | CSV import/export | Email + calendar sync; enrichment providers | Telephony, accounting, marketing automation |
| Reporting | Pipeline, activity, conversion basic dashboards | Cohort + funnel analytics; leaderboards | Custom report builder, semantic layer |
| AI | A1 read-only insights; draft updates for deals/activities | Lead routing suggestions, next best action | Autonomous “agentic” sequences with guardrails |

---

## Core entities & data model

### 4.1 Entity overview

Core CRM entities:

- **Account**: company/organization you sell to.
- **Contact**: person at an account.
- **Lead**: pre-account/contact prospect (or early-stage contact not yet qualified).
- **Deal (Opportunity)**: revenue pursuit with defined pipeline and stage.
- **Activity**: canonical log item that can represent calls, emails, meetings, notes, tasks, status changes, approvals.
- **Pipeline**: defines stages, probabilities, exit criteria.
- **Stage**: ordered step in pipeline.
- **Product** and **Pricebook**: what you sell and at what price.
- **Quote** + **QuoteLine**: configured commercial offer tied to a deal.
- **Territory**: assignment/visibility grouping for accounts and reps.
- **User/Role**: ties to KAIROS org membership model.

KAIROS-aligned existing primitives to reuse:

- Tasks and events already exist; CRM should **reference** them and/or unify them via an **Activity abstraction**.
- Notes already exist; CRM should allow linking notes to account/deal/contact and optionally mirror a note as an activity.
- Notifications exist; use them for @mentions, assignments, approvals.

### 4.2 Relationships

Minimum relational map:

- Account 1—N Contacts
- Account 1—N Deals
- Lead can convert → Account + Contact (+ optionally Deal)
- Deal 1—N Activities
- Contact 1—N Activities
- Account 1—N Activities
- Pipeline 1—N Stages
- Deal N—1 Pipeline, Deal N—1 Stage
- Deal 1—N Quotes; Quote 1—N QuoteLines; QuoteLines reference Products
- Territory 1—N Users (optional) and Territory 1—N Accounts (optional)

### 4.3 Field-level details (recommended)

Below are recommended fields; not all are required for MVP.

#### Account

- `id`
- `organizationId` (tenant)
- `workspaceId` (optional; if KAIROS uses workspaces as sub-tenants)
- `name`
- `domain` (for dedupe + enrichment)
- `industry`, `sizeBand`, `revenueBand`
- `billingAddress`, `shippingAddress`
- `ownerUserId`
- `territoryId?`
- `lifecycleStage` (Prospect/Customer/Churned)
- `tags[]`
- `createdAt`, `updatedAt`, `lastActivityAt`
- `source` (import/web/manual/integration)

#### Contact

- `id`, `organizationId`
- `accountId?` (nullable to support pre-account contacts)
- `firstName`, `lastName`
- `title`, `department`
- `email`, `phone`
- `linkedinUrl?`
- `ownerUserId`
- `status` (Active/Inactive)
- `consent` (marketing consent flags)
- `createdAt`, `updatedAt`, `lastActivityAt`

#### Lead

- `id`, `organizationId`
- `fullName?`, `email?`, `phone?`
- `companyName?`, `companyDomain?`
- `source` (webform/csv/manual/referral)
- `status` (New/Working/Qualified/Disqualified)
- `disqualifyReason?`
- `ownerUserId?` (unassigned leads supported)
- `score?` (numeric)
- `createdAt`, `updatedAt`, `lastTouchedAt`
- Conversion fields: `convertedAt?`, `convertedAccountId?`, `convertedContactId?`, `convertedDealId?`

#### Pipeline

- `id`, `organizationId`
- `name`
- `type` (NewBiz/Renewal/Upsell)
- `isDefault`

#### Stage

- `id`, `pipelineId`
- `name`
- `order`
- `probability` (0–1)
- `isClosedWon`, `isClosedLost`
- `exitCriteria` (structured text, optionally machine-checkable rules later)

#### Deal (Opportunity)

- `id`, `organizationId`
- `accountId`
- `primaryContactId?`
- `name` (often Account + Product)
- `ownerUserId`
- `pipelineId`, `stageId`
- `forecastCategory` (Pipeline/BestCase/Commit/Omitted)
- `amount` + `currency`
- `closeDate`
- `probabilityOverride?` (if managers override)
- `source` (lead conversion, outbound, partner)
- `type` (NewBiz/Renewal/Upsell)
- `nextActivityAt?` (key hygiene field)
- `lastStageChangedAt`
- `createdAt`, `updatedAt`, `lastActivityAt`
- Lost reasons: `closedLostReason?`, `competitor?`

#### Activity (CRM)

Activity is the normalization layer that makes reporting and timelines coherent.

- `id`, `organizationId`
- `type` (Call/Email/Meeting/Note/Task/StageChange/Approval/QuoteSent/etc.)
- `occurredAt`
- `createdByUserId`
- `assignedToUserId?`
- `accountId?`, `contactId?`, `dealId?`, `leadId?`
- `subject`, `body?` (or pointer to note/message)
- `externalRef?` (e.g., email message id, calendar event id)
- `metadata` (JSON for type-specific fields)
- `visibility` (Private/Team/Org)

Linking to existing KAIROS tables:

- For meetings: `metadata.calendarEventId` referencing events module.
- For tasks: `metadata.taskId` referencing tasks module.
- For notes: `metadata.noteId` referencing notes module.

#### Product / Pricebook

- Product: `id`, `organizationId`, `sku`, `name`, `description`, `isActive`, `defaultPrice`, `currency`
- Pricebook: `id`, `organizationId`, `name`, `currency`, `effectiveFrom`, `effectiveTo`

#### Quote

- `id`, `organizationId`, `dealId`
- `status` (Draft/Sent/Accepted/Rejected/Expired)
- `validUntil`
- `subtotal`, `discount`, `tax`, `total` (store totals for audit)
- `createdByUserId`, `approvedByUserId?`
- `approvalStatus` (NotRequired/Pending/Approved/Rejected)
- `sentAt?`, `acceptedAt?`

#### QuoteLine

- `id`, `quoteId`, `productId`
- `quantity`, `unitPrice`, `discount`, `lineTotal`

#### Territory

- `id`, `organizationId`
- `name`
- `rules` (MVP: manual assignment; V1+: rule-based by region/industry)
- `managerUserId?`

### 4.4 Timeline/audit model

KAIROS already emphasizes auditability for agent actions. CRM benefits strongly from the same.

Recommended layers:

1. **Business timeline** (what users see): activities + stage changes + notes + meetings.
2. **Audit log** (what compliance needs): who changed what field, from what value, when, from where.

Two practical approaches:

- **Relational + append-only activity table**: store canonical entity tables plus `crm_activities` and `crm_audit_log`.
- **Event-sourced core** (advanced): store domain events and build projections for accounts/deals/etc.

This is explored in [Architecture options](#architecture-options--storage-considerations).

---

## Key workflows

### 5.1 Lead capture & qualification

Goals:

- Fast capture, dedupe, ownership assignment.
- Clear qualification criteria and conversion.

Workflow:

1. **Capture**
   - manual entry
   - CSV import
   - web-to-lead endpoint (V1)
   - enrichment hook (V1)
2. **Triage**
   - status moves New → Working
   - assign owner (round robin or territory rule in V1)
   - create initial follow-up task
3. **Qualify**
   - capture minimum fields: account name/domain, contact email, need/timeline
   - record disqualify reason if lost
4. **Convert**
   - create or match Account by domain/name
   - create Contact
   - optionally create Deal in default pipeline at first stage
   - write conversion Activity items

AI assist (safe):

- A1 highlights missing fields and suggests next step; A2 drafts follow-up tasks; A3 drafts “research note” for the account.

### 5.2 Deal progression (pipeline)

Goals:

- Stage progression is explicit, with exit criteria.
- Hygiene: every open deal has a next activity.

Workflow:

1. Create deal (from lead conversion or manually).
2. Set pipeline, stage, amount, close date.
3. Every stage change logs an Activity of type `StageChange`.
4. Stage exit criteria (MVP: informational; V1: warnings; V2: enforce).
5. Closed won/lost requires reason codes and competitor (optional).

Manager workflows:

- view team pipeline
- override forecast category or probability (with audit)

### 5.3 Activity logging & follow-ups

Goals:

- Make logging easier than not logging.
- Normalize all work into activities.

Activity sources:

- Manual log (call/email note)
- From KAIROS event (meeting)
- From KAIROS task (follow-up)
- From quote actions (sent/accepted)
- From agent actions (drafted emails, created tasks) → audit + activity

Follow-up creation:

- one-click: “Create follow-up task” from activity or deal stage
- auto: when meeting ends, create “send recap” task

### 5.4 Meetings & scheduling

Goals:

- Meetings are core sales activities.

Workflow:

1. Schedule meeting (using existing calendar/events).
2. Link event to deal/contact/account.
3. Meeting reminder notifications.
4. After meeting: prompt for outcome + next step; create follow-up task.

Integration path:

- V1: two-way calendar sync
- V2: meeting transcription + summaries (if product direction permits)

### 5.5 Forecasting & rollups

Forecasting has two layers:

- **System forecast**: calculated via stage probability (or weighted) and close date.
- **Commit forecast**: rep/manager classification (Commit/BestCase/Pipeline/Omitted).

Rollups:

- by manager (team tree)
- by territory
- by pipeline type (new biz vs renewal)
- by month/quarter

Audit:

- forecast category changes and amount/close date edits should be auditable and visible on the deal timeline.

### 5.6 Discounts, approvals, and quote flow

Minimum viable approval story:

- Rep requests discount exception on a quote.
- Manager approves/rejects.
- Decision is logged (activity + audit), and triggers notification.

V1 policy rules:

- auto-approval thresholds (e.g., discount ≤ 10%)
- approvals required for non-standard terms
- multi-step approval chain (finance/legal) in V2

---

## Permissions & roles aligned with KAIROS org model

KAIROS already has organizations and members; CRM should map cleanly.

### Proposed role model (CRM-specific capabilities)

Base roles:

- **Sales Rep**
  - create/edit own leads, deals, activities
  - view accounts/contacts assigned to their territory/team
  - request approvals
- **Sales Manager**
  - everything reps can do
  - view/edit team deals
  - override forecast category and approve discounts
  - run team reports
- **RevOps/Admin**
  - manage pipelines, stages, products, territories
  - manage imports, integrations
  - configure roles
- **Read-only / Exec**
  - view dashboards + pipeline, no edits

### Record visibility rules

Recommended hierarchy (simple to reason about):

1. **Org boundary**: all CRM data belongs to an org.
2. **Ownership**: each lead/deal has an owner.
3. **Team**: managers can see all records owned by their direct/indirect reports.
4. **Territory**: optional additional visibility constraint.
5. **Private activities**: some activities can be private (e.g., sensitive notes).

### Permission checks (where to enforce)

- **API layer**: every tRPC procedure must enforce org membership and record-level access.
- **DB constraints**: foreign keys enforce org scoping; row-level security is optional (V2) depending on deployment.
- **Audit**: log access to sensitive exports (GDPR / customer data exports).

---

## Integrations

### Email + calendar

Options:

- **Google Workspace + Microsoft 365**
  - OAuth per user
  - two-way sync for calendar events
  - email capture for activity timeline (V1)

MVP approach:

- Link KAIROS calendar events to CRM entities; do not ingest emails yet.

V1 approach:

- Ingest email metadata (from, to, subject, sentAt) and store body optionally with retention policy.

### Telephony

- Twilio, Aircall, Dialpad, RingCentral (V2)
- Capture call logs and recordings (if allowed) as activities.

### Enrichment

- Clearbit (legacy), Apollo/ZoomInfo, People Data Labs
- Store enrichment snapshots separately to avoid overwriting user-entered truth.

### Accounting/CPQ

- QuickBooks, Xero, NetSuite (V2)
- Sync customers and invoices; push won deals.

### Import/export

- CSV import with mapping
- Export pipelines/activities for analysis
- GDPR “data subject export”

Integration architecture:

- Prefer **connector abstraction**: each integration is a module that can write activities and update entities through well-defined service boundaries.

---

## AI agent roles (leveraging KAIROS A1–A5 patterns)

KAIROS agent pattern (per docs) is router/orchestrator with strict tool allowlists and a Draft → Confirm → Apply lifecycle.

CRM agent design should reuse this:

### Proposed CRM agent suite

- **A1 Workspace Concierge (read-only)**
  - CRM read insights: pipeline health, stale deals, missing next activity, “today’s priorities.”
  - Answers: “What deals are at risk this month?”

- **A2 Task Planner (write to tasks)**
  - Generates follow-up tasks from pipeline context.
  - Creates task sequences for new leads or after meetings.

- **A3 Notes Vault (write to notes)**
  - Creates account research notes, meeting recap notes.
  - Uses locked notes for sensitive competitive intel if desired.

- **A4 Events Publisher (calendar/events)**
  - Schedules meetings from CRM context: “Set a 30-min call with Jane next week.”

- **A5 Org Admin (roles/config)**
  - Manages CRM role assignments and team structure (manager/reporting lines), pipeline configuration permissions.

### New domain-specific agents (optional)

If CRM becomes large enough, introduce additional scoped agents rather than expanding A1:

- **A6 CRM Deal Desk** (writes to deals/quotes; requires confirmations)
  - Draft quote, propose discount, generate approval request.

- **A7 CRM Data Steward** (imports/dedupe/enrichment)
  - Draft merges, detect duplicates, propose data cleanup actions.

### Where agents fit in workflows

- Lead intake → A1 identifies missing fields → A2 drafts tasks → A3 saves research note.
- Deal stage change → A1 suggests stage exit checklist → A2 drafts next steps.
- Forecast week → A1 prepares forecast narrative; manager approves; audit logs.

Safety requirements (non-negotiable):

- Agents can propose merges/edits but **must not auto-apply** without explicit confirmation.
- Any mass edit/export requires elevated confirmation and stricter rate limits.

---

## Architecture options & storage considerations

### Option A: Relational CRM tables + Activity + Audit log (recommended default)

**Summary**: Keep domain entities (accounts/contacts/leads/deals) as normal tables. Add two append-only logs:

- `crm_activities` (user-visible timeline)
- `crm_audit_log` (compliance + debugging)

Pros:

- Simple, fast to implement.
- Great fit for Drizzle/Postgres.
- Easy to query for reports.

Cons:

- Harder to reconstruct exact state at a point in time without careful auditing.

### Option B: Event-sourced deals (targeted event sourcing)

**Summary**: Store `deal_events` (stage changed, amount updated, close date changed, etc.). Project into `deals_current`.

Pros:

- Perfect auditability.
- Easy “as-of” reporting (what did we think forecast would be last week?).

Cons:

- More complexity: projections, idempotency, backfills.

Recommended hybrid:

- Event-source **deal changes and forecast changes** (high value) while keeping accounts/contacts relational.

### Search considerations

CRM benefits from fast global search across:

- account names/domains
- contacts (name, email)
- deals (name)
- activities/notes (full text)

Approaches:

1. **Postgres full-text search (FTS)** (MVP/V1)
   - `tsvector` columns for searchable entities.
   - GIN indexes.

2. **External search (Meilisearch/Typesense/Elastic)** (V2)
   - sync via outbox/event stream.

### Real-time and notifications

Leverage existing Socket.IO + Redis pattern:

- deal stage changes emit `deal:updated`
- approvals emit `approval:requested`
- mention in activity body emits notification

### Data partitioning / multi-tenancy

- All CRM tables must carry `organizationId`.
- If KAIROS has `workspaceId`, decide whether CRM is scoped to workspace or org:
  - **Org-scoped CRM** (recommended): consistent with sales org; workspaces can act as views/filters.
  - **Workspace-scoped CRM**: simpler isolation but complicates cross-team selling.

---

## Reporting/analytics/forecasting approaches

### Core reporting primitives

- Pipeline by stage (count + amount)
- Weighted pipeline (amount × probability)
- Conversion funnel (Lead → Qualified → Deal → Won)
- Activity volume (calls/emails/meetings) per rep and per deal
- SLA: time to first touch, time in stage

### Forecasting models

Start simple and auditable:

1. **Stage-weighted**: `forecast = Σ(deal.amount × stage.probability)` for deals in period.
2. **Category-based**:
   - Commit: 100% weight
   - Best Case: 50–70%
   - Pipeline: stage probability
   - Omitted: 0%

Enhancements (V2):

- time-series calibration per stage (historical win rates)
- per-rep bias correction
- scenario planning (push deals out, adjust close dates)

### KPI definitions (must be explicit)

- “Pipeline coverage” = pipeline amount / quota for a period
- “Hygiene” = % deals with next activity within N days
- “Stale deal” = no activity in N days OR close date slipped > M times

---

## Risks & compliance (GDPR, security, trust)

### GDPR and privacy

CRM contains personal data (contacts/leads). Requirements:

- Lawful basis documentation and consent flags.
- Data retention policies (especially for emails/call recordings).
- Right to access/export and right to delete.
- Purpose limitation: avoid collecting unnecessary personal data.

### Security considerations

- Strict org scoping on every query.
- Sensitive fields (personal phone/email) should be masked in some views if role requires.
- Audit exports and admin actions.
- Agent safety: no autonomous bulk actions; confirm/apply required.

### Data quality risks

- Dupes (account domain collisions)
- Stale pipeline (no next activity)
- Integration drift (conflicts between email sync and user edits)

Mitigations:

- Dedupe suggestions + merge drafts with confirmation.
- Hygiene dashboards + automated reminders.
- Write conflict rules: human edits win; integration writes create an activity instead of overwriting.

---

## Roadmap (milestones + dependencies)

Milestones are organized around delivering a usable sales motion early while building toward forecasting, approvals, and integrations.

### Milestone 0: Foundations (schema + navigation + permissions)

Dependencies:

- Confirm org/workspace scoping decision.
- Define roles and record visibility.

Deliverables:

- Entities: accounts, contacts, leads, deals, pipelines/stages.
- Basic permissions enforcement.
- Entity pages with timelines (even if minimal).

### Milestone 1: Activity timeline + KAIROS reuse

Deliverables:

- `crm_activities` with linking to tasks/events/notes.
- Deal stage change logging.
- Notifications for assignments and mentions.

### Milestone 2: Lead conversion + pipeline hygiene

Deliverables:

- Lead capture/import.
- Qualification + conversion flow.
- Next-activity tracking and stale deal reports.

### Milestone 3: Forecasting v1

Deliverables:

- Forecast rollups by rep/manager/period.
- Forecast categories + manager overrides with audit.

### Milestone 4: Quotes + approvals

Deliverables:

- Quote + quote lines.
- Discount approvals workflow with notifications.

### Milestone 5: Integrations (calendar + email first)

Deliverables:

- Two-way calendar sync.
- Email activity capture (metadata first).

### Milestone 6: AI-assisted CRM

Deliverables:

- A1 insights dashboards.
- A2 follow-up sequences.
- Optional A6 Deal Desk with strict confirmation.

---

## Appendix: Glossary and conventions

- **Account**: a company; sometimes called customer/org.
- **Contact**: a person at an account.
- **Lead**: unqualified prospect record.
- **Deal/Opportunity**: revenue pursuit.
- **Activity**: any logged interaction or change event.
- **Pipeline**: ordered stages; per motion type.
- **Forecast category**: rep/manager confidence classification.

Conventions:

- Prefer append-only activities for timeline.
- Prefer explicit audit log for sensitive fields.
- AI changes must follow Draft → Confirm → Apply and be logged.
