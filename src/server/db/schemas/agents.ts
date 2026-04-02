import { sql } from "drizzle-orm";
import { index, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createTable, agentTaskPlannerDraftStatusEnum, agentNotesVaultDraftStatusEnum } from "./enums";
import { users } from "./users";
import { projects } from "./projects";

export const agentTaskPlannerDrafts = createTable(
  "agent_task_planner_drafts",
  (d) => ({
    id: varchar("id", { length: 80 }).primaryKey(),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    planJson: text("plan_json").notNull(),
    planHash: varchar("plan_hash", { length: 64 }).notNull(),
    status: agentTaskPlannerDraftStatusEnum("status").notNull().default("draft"),
    confirmationToken: text("confirmation_token"),
    confirmedAt: timestamp("confirmed_at", { mode: "date", withTimezone: true }),
    appliedAt: timestamp("applied_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
  }),
  (t) => [
    index("a2_draft_user_idx").on(t.userId),
    index("a2_draft_project_idx").on(t.projectId),
    index("a2_draft_status_idx").on(t.status),
    index("a2_draft_plan_hash_idx").on(t.planHash),
  ],
);

export const agentTaskPlannerApplies = createTable(
  "agent_task_planner_applies",
  (d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    draftId: varchar("draft_id", { length: 80 })
      .notNull()
      .references(() => agentTaskPlannerDrafts.id, { onDelete: "cascade" }),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    planHash: varchar("plan_hash", { length: 64 }).notNull(),
    resultJson: text("result_json").notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("a2_apply_draft_idx").on(t.draftId),
    index("a2_apply_user_idx").on(t.userId),
    index("a2_apply_project_idx").on(t.projectId),
    index("a2_apply_plan_hash_idx").on(t.planHash),
  ],
);

export const agentNotesVaultDrafts = createTable(
  "agent_notes_vault_drafts",
  (d) => ({
    id: varchar("id", { length: 80 }).primaryKey(),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    planJson: text("plan_json").notNull(),
    planHash: varchar("plan_hash", { length: 64 }).notNull(),
    status: agentNotesVaultDraftStatusEnum("status").notNull().default("draft"),
    confirmationToken: text("confirmation_token"),
    confirmedAt: timestamp("confirmed_at", { mode: "date", withTimezone: true }),
    appliedAt: timestamp("applied_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }),
  }),
  (t) => [
    index("a3_draft_user_idx").on(t.userId),
    index("a3_draft_status_idx").on(t.status),
    index("a3_draft_plan_hash_idx").on(t.planHash),
  ],
);

export const agentNotesVaultApplies = createTable(
  "agent_notes_vault_applies",
  (d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    draftId: varchar("draft_id", { length: 80 })
      .notNull()
      .references(() => agentNotesVaultDrafts.id, { onDelete: "cascade" }),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planHash: varchar("plan_hash", { length: 64 }).notNull(),
    resultJson: text("result_json").notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("a3_apply_draft_idx").on(t.draftId),
    index("a3_apply_user_idx").on(t.userId),
    index("a3_apply_plan_hash_idx").on(t.planHash),
  ],
);
