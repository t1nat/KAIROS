import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import { index, primaryKey, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { createTable, shareStatusEnum, permissionEnum, projectStatusEnum } from "./enums";
import { users } from "./users";
import { organizations } from "./organizations";

export const projects = createTable(
  "projects",
  (d) => ({
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    imageUrl: varchar("image_url", { length: 512 }),
    status: projectStatusEnum("status").notNull().default("active"),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shareStatus: shareStatusEnum("share_status").notNull().default("private"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  }),
  (t) => [
    index("project_created_by_idx").on(t.createdById),
    index("project_org_idx").on(t.organizationId),
  ]
);

export const projectCollaborators = createTable(
  "project_collaborators",
  (d) => ({
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    collaboratorId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: permissionEnum("permission").notNull(),
    joinedAt: timestamp("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    primaryKey({ columns: [t.projectId, t.collaboratorId] }),
    index("project_collaborator_user_idx").on(t.collaboratorId),
  ]
);

export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
export type ProjectCollaborator = InferSelectModel<typeof projectCollaborators>;
export type NewProjectCollaborator = InferInsertModel<typeof projectCollaborators>;
