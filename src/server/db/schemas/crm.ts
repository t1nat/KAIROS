import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { createTable } from "./enums";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * CRM MVP schema.
 *
 * Notes on conventions:
 * - CRM tables use integer identity PKs (matches most KAIROS domain tables).
 * - User references are varchar -> users.id.
 * - Organization scoping is enforced by organizationId on every table.
 */

export const crmAccountLifecycleEnum = ["prospect", "customer", "churned"] as const;
export type CrmAccountLifecycle = (typeof crmAccountLifecycleEnum)[number];

export const crmLeadStatusEnum = [
  "new",
  "working",
  "qualified",
  "disqualified",
] as const;
export type CrmLeadStatus = (typeof crmLeadStatusEnum)[number];

export const crmDealForecastCategoryEnum = [
  "pipeline",
  "best_case",
  "commit",
  "omitted",
] as const;
export type CrmDealForecastCategory = (typeof crmDealForecastCategoryEnum)[number];

export const crmPipelineTypeEnum = ["new_biz", "renewal", "upsell"] as const;
export type CrmPipelineType = (typeof crmPipelineTypeEnum)[number];

export const crmActivityVisibilityEnum = ["org", "private"] as const;
export type CrmActivityVisibility = (typeof crmActivityVisibilityEnum)[number];

export const crmActivityTypeEnum = [
  "call",
  "email",
  "meeting",
  "note",
  "task",
  "stage_change",
  "system",
] as const;
export type CrmActivityType = (typeof crmActivityTypeEnum)[number];

export const crmAccounts = createTable(
  "crm_accounts",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 256 }).notNull(),
    domain: varchar("domain", { length: 256 }),

    industry: varchar("industry", { length: 128 }),
    sizeBand: varchar("size_band", { length: 64 }),
    revenueBand: varchar("revenue_band", { length: 64 }),

    ownerUserId: varchar("owner_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    lifecycleStage: varchar("lifecycle_stage", { length: 32 }).default("prospect"),
    source: varchar("source", { length: 32 }).default("manual"),

    tags: jsonb("tags"),

    lastActivityAt: timestamp("last_activity_at").default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("crm_accounts_org_name_idx").on(t.organizationId, t.name),
    index("crm_accounts_org_domain_idx").on(t.organizationId, t.domain),
    index("crm_accounts_org_owner_idx").on(t.organizationId, t.ownerUserId),
    index("crm_accounts_last_activity_idx").on(t.lastActivityAt),
  ],
);

export const crmContacts = createTable(
  "crm_contacts",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    accountId: integer("account_id").references(() => crmAccounts.id, {
      onDelete: "set null",
    }),

    firstName: varchar("first_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),

    title: varchar("title", { length: 128 }),
    department: varchar("department", { length: 128 }),

    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    linkedinUrl: varchar("linkedin_url", { length: 512 }),

    ownerUserId: varchar("owner_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    status: varchar("status", { length: 32 }).default("active"),

    lastActivityAt: timestamp("last_activity_at").default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("crm_contacts_org_account_idx").on(t.organizationId, t.accountId),
    index("crm_contacts_org_email_idx").on(t.organizationId, t.email),
    index("crm_contacts_org_owner_idx").on(t.organizationId, t.ownerUserId),
    index("crm_contacts_last_activity_idx").on(t.lastActivityAt),
  ],
);

export const crmLeads = createTable(
  "crm_leads",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    ownerUserId: varchar("owner_user_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),

    fullName: varchar("full_name", { length: 256 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),

    companyName: varchar("company_name", { length: 256 }),
    companyDomain: varchar("company_domain", { length: 256 }),

    source: varchar("source", { length: 32 }).default("manual"),

    status: varchar("status", { length: 32 }).default("new").notNull(),
    disqualifyReason: varchar("disqualify_reason", { length: 512 }),

    score: integer("score"),

    lastTouchedAt: timestamp("last_touched_at").default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),

    convertedAt: timestamp("converted_at"),
    convertedAccountId: integer("converted_account_id").references(() => crmAccounts.id, {
      onDelete: "set null",
    }),
    convertedContactId: integer("converted_contact_id").references(() => crmContacts.id, {
      onDelete: "set null",
    }),
    convertedDealId: integer("converted_deal_id"),
  }),
  (t) => [
    index("crm_leads_org_status_updated_idx").on(t.organizationId, t.status, t.updatedAt),
    index("crm_leads_org_owner_status_idx").on(t.organizationId, t.ownerUserId, t.status),
    index("crm_leads_org_email_idx").on(t.organizationId, t.email),
  ],
);

export const crmPipelines = createTable(
  "crm_pipelines",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 128 }).notNull(),
    type: varchar("type", { length: 32 }).default("new_biz").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),

    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("crm_pipelines_org_default_idx").on(t.organizationId, t.isDefault),
    uniqueIndex("crm_pipelines_org_name_uq").on(t.organizationId, t.name),
  ],
);

export const crmStages = createTable(
  "crm_stages",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    pipelineId: integer("pipeline_id")
      .notNull()
      .references(() => crmPipelines.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 128 }).notNull(),
    order: integer("order").notNull(),

    /** basis points 0..10000 (avoids float issues) */
    probabilityBps: integer("probability_bps").default(0).notNull(),

    isClosedWon: boolean("is_closed_won").default(false).notNull(),
    isClosedLost: boolean("is_closed_lost").default(false).notNull(),

    exitCriteria: varchar("exit_criteria", { length: 1024 }),

    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    uniqueIndex("crm_stages_pipeline_order_uq").on(t.pipelineId, t.order),
    index("crm_stages_pipeline_idx").on(t.pipelineId),
  ],
);

export const crmDeals = createTable(
  "crm_deals",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    accountId: integer("account_id")
      .notNull()
      .references(() => crmAccounts.id, { onDelete: "cascade" }),

    primaryContactId: integer("primary_contact_id").references(() => crmContacts.id, {
      onDelete: "set null",
    }),

    name: varchar("name", { length: 256 }).notNull(),

    ownerUserId: varchar("owner_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    pipelineId: integer("pipeline_id")
      .notNull()
      .references(() => crmPipelines.id, { onDelete: "restrict" }),

    stageId: integer("stage_id")
      .notNull()
      .references(() => crmStages.id, { onDelete: "restrict" }),

    forecastCategory: varchar("forecast_category", { length: 32 })
      .default("pipeline")
      .notNull(),

    amount: numeric("amount", { precision: 12, scale: 2 }).default("0").notNull(),
    currency: varchar("currency", { length: 3 }).default("USD").notNull(),

    closeDate: date("close_date"),

    nextActivityAt: timestamp("next_activity_at"),
    lastStageChangedAt: timestamp("last_stage_changed_at").default(sql`CURRENT_TIMESTAMP`),

    lastActivityAt: timestamp("last_activity_at").default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),

    closedLostReason: varchar("closed_lost_reason", { length: 512 }),
    competitor: varchar("competitor", { length: 256 }),
  }),
  (t) => [
    index("crm_deals_org_owner_idx").on(t.organizationId, t.ownerUserId),
    index("crm_deals_org_pipeline_stage_idx").on(t.organizationId, t.pipelineId, t.stageId),
    index("crm_deals_org_close_date_idx").on(t.organizationId, t.closeDate),
    index("crm_deals_org_next_activity_idx").on(t.organizationId, t.nextActivityAt),
    index("crm_deals_account_idx").on(t.accountId),
    index("crm_deals_last_activity_idx").on(t.lastActivityAt),
  ],
);

export const crmActivities = createTable(
  "crm_activities",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    type: varchar("type", { length: 32 }).notNull(),

    occurredAt: timestamp("occurred_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),

    createdByUserId: varchar("created_by_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    assignedToUserId: varchar("assigned_to_user_id", { length: 255 }).references(() => users.id, {
      onDelete: "set null",
    }),

    accountId: integer("account_id").references(() => crmAccounts.id, {
      onDelete: "cascade",
    }),
    contactId: integer("contact_id").references(() => crmContacts.id, {
      onDelete: "cascade",
    }),
    dealId: integer("deal_id").references(() => crmDeals.id, {
      onDelete: "cascade",
    }),
    leadId: integer("lead_id").references(() => crmLeads.id, {
      onDelete: "cascade",
    }),

    subject: varchar("subject", { length: 256 }),
    body: varchar("body", { length: 8000 }),

    externalRef: varchar("external_ref", { length: 256 }),
    metadata: jsonb("metadata"),

    visibility: varchar("visibility", { length: 32 }).default("org").notNull(),
  }),
  (t) => [
    index("crm_activities_org_occurred_idx").on(t.organizationId, t.occurredAt),
    index("crm_activities_deal_occurred_idx").on(t.dealId, t.occurredAt),
    index("crm_activities_account_occurred_idx").on(t.accountId, t.occurredAt),
    index("crm_activities_contact_occurred_idx").on(t.contactId, t.occurredAt),
    index("crm_activities_lead_occurred_idx").on(t.leadId, t.occurredAt),
    index("crm_activities_creator_occurred_idx").on(t.createdByUserId, t.occurredAt),
  ],
);

export const crmAuditLog = createTable(
  "crm_audit_log",
  (_d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),

    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),

    entityType: varchar("entity_type", { length: 32 }).notNull(),
    entityId: integer("entity_id").notNull(),

    action: varchar("action", { length: 32 }).notNull(),

    field: varchar("field", { length: 128 }),
    oldValue: varchar("old_value", { length: 2048 }),
    newValue: varchar("new_value", { length: 2048 }),

    actorUserId: varchar("actor_user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    actorType: varchar("actor_type", { length: 32 }).default("human").notNull(),
    requestId: varchar("request_id", { length: 128 }),

    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("crm_audit_org_entity_created_idx").on(
      t.organizationId,
      t.entityType,
      t.entityId,
      t.createdAt,
    ),
    index("crm_audit_actor_created_idx").on(t.actorUserId, t.createdAt),
  ],
);
