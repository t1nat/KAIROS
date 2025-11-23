// src/server/db/schema.ts - UPDATED WITH SETTINGS FIELDS

import { type InferInsertModel, type InferSelectModel, relations, sql } from "drizzle-orm"; 
import {
  index,
  pgTableCreator,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
  pgEnum,
  integer,
  json,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";
import crypto from "node:crypto";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM.
 */
export const createTable = pgTableCreator((name) => `app_${name}`);
 
// --- ENUM DEFINITIONS ---
export const shareStatusEnum = pgEnum("share_status", ['private', 'shared_read', 'shared_write']);
export const permissionEnum = pgEnum("permission", ['read', 'write']); 
export const taskStatusEnum = pgEnum("task_status", ['pending', 'in_progress', 'completed', 'blocked']);
export const taskPriorityEnum = pgEnum("task_priority", ['low', 'medium', 'high', 'urgent']);
export const usageModeEnum = pgEnum("usage_mode", ["personal", "organization"]);
export const orgRoleEnum = pgEnum("org_role", ["admin", "worker"]);
export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);
export const languageEnum = pgEnum("language", ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar"]);
export const dateFormatEnum = pgEnum("date_format", ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]);

// --- USER TABLE (UPDATED WITH SETTINGS) ---
export const users = createTable("user", (d) => ({
    id: d
      .varchar({ length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: d.varchar({ length: 255 }),
    email: d.varchar({ length: 255 }).notNull(),
    emailVerified: d
      .timestamp({
        mode: "date",
        withTimezone: true,
      })
      .$defaultFn(() => new Date()),
    image: d.varchar({ length: 255 }), // This is automatically set by Google OAuth
    usageMode: usageModeEnum("usage_mode"),
    password: varchar("password", { length: 255 }),
    passwordResetToken: varchar("password_reset_token", { length: 255 }),
    passwordResetExpires: timestamp("password_reset_expires", { mode: "date", withTimezone: true }),
    
    // === PROFILE SETTINGS ===
    bio: text("bio"),
    
    // === NOTIFICATION SETTINGS ===
    emailNotifications: boolean("email_notifications").default(true).notNull(),
    projectUpdatesNotifications: boolean("project_updates_notifications").default(true).notNull(),
    eventRemindersNotifications: boolean("event_reminders_notifications").default(false).notNull(),
    marketingEmailsNotifications: boolean("marketing_emails_notifications").default(false).notNull(),
    
    // === LANGUAGE & REGION SETTINGS ===
    language: languageEnum("language").default("en").notNull(),
    timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
    dateFormat: dateFormatEnum("date_format").default("MM/DD/YYYY").notNull(),
    
    // === APPEARANCE SETTINGS ===
    theme: themeEnum("theme").default("light").notNull(),
    accentColor: varchar("accent_color", { length: 20 }).default("indigo").notNull(),
    
    // === PRIVACY SETTINGS ===
    profileVisibility: boolean("profile_visibility").default(true).notNull(),
    showOnlineStatus: boolean("show_online_status").default(true).notNull(),
    activityTracking: boolean("activity_tracking").default(false).notNull(),
    dataCollection: boolean("data_collection").default(false).notNull(),
    
    // === SECURITY SETTINGS ===
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
    
    // === TIMESTAMPS ===
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
}));

// --- USER SETTINGS TYPE EXPORT ---
export type UserSettings = {
  // Profile
  name: string | null;
  bio: string | null;
  image: string | null;
  
  // Notifications
  emailNotifications: boolean;
  projectUpdatesNotifications: boolean;
  eventRemindersNotifications: boolean;
  marketingEmailsNotifications: boolean;
  
  // Language & Region
  language: "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh" | "ar";
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  
  // Appearance
  theme: "light" | "dark" | "system";
  accentColor: string;
  
  // Privacy
  profileVisibility: boolean;
  showOnlineStatus: boolean;
  activityTracking: boolean;
  dataCollection: boolean;
  
  // Security
  twoFactorEnabled: boolean;
};

// --- ORGANIZATIONS TABLE ---
export const organizations = createTable(
  "organizations",
  (_d) => ({
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 256 }).notNull(),
    accessCode: varchar("access_code", { length: 14 }).notNull().unique(),
    createdById: varchar("created_by_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("org_created_by_idx").on(t.createdById),
    index("org_access_code_idx").on(t.accessCode),
  ]
);

// --- ORGANIZATION MEMBERS TABLE ---
export const organizationMembers = createTable(
  "organization_members",
  (_d) => ({
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: orgRoleEnum("role").notNull(),
    joinedAt: timestamp("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("org_member_org_idx").on(t.organizationId),
    index("org_member_user_idx").on(t.userId),
  ]
);

// --- PROJECTS TABLE ---
export const projects = createTable(
  "projects",
  (d) => ({
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
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

// --- TASKS TABLE ---
export const tasks = createTable(
  "tasks",
  (d) => ({
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    assignedToId: d
      .varchar({ length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: taskPriorityEnum("priority").notNull().default("medium"),
    dueDate: timestamp("due_date", { mode: "date", withTimezone: true }),
    completedAt: timestamp("completed_at", { mode: "date", withTimezone: true }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    orderIndex: integer("order_index").notNull().default(0),
  }),
  (t) => [
    index("task_project_idx").on(t.projectId),
    index("task_assigned_to_idx").on(t.assignedToId),
    index("task_created_by_idx").on(t.createdById),
  ]
);

// --- DOCUMENTS TABLE ---
export const documents = createTable(
  "documents",
  (_d) => ({
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 256 }).notNull(),
    content: text("content").notNull(),
    passwordHash: varchar("password_hash", { length: 256 }),
    organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    createdById: varchar("created_by_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    annotations: json("annotations"),
    importedFrom: varchar("imported_from", { length: 256 }),
    importedAt: timestamp("imported_at", { mode: "date", withTimezone: true }),
  }),
  (t) => [
    index("doc_created_by_idx").on(t.createdById),
    index("doc_org_idx").on(t.organizationId),
  ]
);

// --- DOCUMENT COLLABORATORS TABLE ---
export const documentCollaborators = createTable(
  "document_collaborators",
  (_d) => ({
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastEdit: timestamp("last_edit")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
  }),
  (t) => [
    index("doc_collab_doc_idx").on(t.documentId),
    index("doc_collab_user_idx").on(t.userId),
  ]
);

// --- DOCUMENT VERSIONS TABLE ---
export const documentVersions = createTable(
  "document_versions",
  (_d) => ({
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    annotations: json("annotations"),
    createdById: varchar("created_by_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("doc_version_doc_idx").on(t.documentId),
    index("doc_version_created_idx").on(t.createdAt),
  ]
);

// --- STICKY NOTES TABLE ---
export const stickyNotes = createTable(
  "sticky_notes",
  (d) => ({
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    passwordHash: varchar("password_hash", { length: 256 }),
    passwordSalt: varchar("password_salt", { length: 256 }),

    // Password reset fields (NEW)
    resetToken: text("reset_token"),
    resetTokenExpiry: timestamp("reset_token_expiry", { withTimezone: true }),

    shareStatus: shareStatusEnum("share_status").notNull(),
  }),
  (t) => [
    index("note_created_by_idx").on(t.createdById),
  ]
);

// --- NOTE COLLABORATORS TABLE ---
export const noteCollaborators = createTable(
  "note_collaborators",
  (d) => ({
    noteId: integer("note_id")
      .notNull()
      .references(() => stickyNotes.id, { onDelete: "cascade" }),
    collaboratorId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permission: permissionEnum("permission").notNull(), 
  }),
  (t) => [
    primaryKey({ columns: [t.noteId, t.collaboratorId] }),
    index("collaborator_user_id_idx").on(t.collaboratorId),
  ]
);

// --- PROJECT COLLABORATORS TABLE ---
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

// --- TASK COMMENTS TABLE ---
export const taskComments = createTable(
  "task_comments",
  (d) => ({
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("task_comment_task_idx").on(t.taskId),
    index("task_comment_user_idx").on(t.createdById),
  ]
);

// --- TASK ACTIVITY LOG TABLE ---
export const taskActivityLog = createTable(
  "task_activity_log",
  (d) => ({
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 100 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("activity_task_idx").on(t.taskId),
    index("activity_user_idx").on(t.userId),
  ]
);

// --- POSTS TABLE ---
export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

// --- ACCOUNTS TABLE ---
export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ],
);

// --- SESSIONS TABLE ---
export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)],
);

// --- VERIFICATION TOKENS TABLE ---
export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// --- EVENTS TABLE ---
export const events = createTable(
  "event",
  (d) => ({
    id: d.serial("id").primaryKey(),
    title: d.varchar("title", { length: 256 }).notNull(),
    description: d.text("description").notNull(),
    imageUrl: d.text("image_url"),
    eventDate: d.timestamp("event_date", { mode: "date", withTimezone: true }).notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("event_created_by_idx").on(t.createdById),
    index("event_date_idx").on(t.eventDate),
  ],
);

// --- EVENT COMMENTS TABLE ---
export const eventComments = createTable(
  "event_comment",
  (d) => ({
    id: d.serial("id").primaryKey(),
    text: d.text("text").notNull(),
    imageUrl: d.text("image_url"),
    eventId: d
      .integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("comment_event_id_idx").on(t.eventId),
    index("comment_created_by_idx").on(t.createdById),
  ],
);

// --- EVENT LIKES TABLE ---
export const eventLikes = createTable(
  "event_like",
  (d) => ({
    eventId: d
      .integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    primaryKey({ columns: [t.eventId, t.createdById] }),
    index("like_event_id_idx").on(t.eventId),
  ],
);

// ===================
// ===== RELATIONS =====
// ===================

// Organizations Relations
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, { fields: [organizations.createdById], references: [users.id] }),
  members: many(organizationMembers),
  projects: many(projects),
  documents: many(documents),
}));

// Organization Members Relations
export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

// Documents Relations
export const documentsRelations = relations(documents, ({ one, many }) => ({
  createdBy: one(users, { fields: [documents.createdById], references: [users.id] }),
  organization: one(organizations, { fields: [documents.organizationId], references: [organizations.id] }),
  collaborators: many(documentCollaborators),
  versions: many(documentVersions),
}));

// Document Collaborators Relations
export const documentCollaboratorsRelations = relations(documentCollaborators, ({ one }) => ({
  document: one(documents, { fields: [documentCollaborators.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentCollaborators.userId], references: [users.id] }),
}));

// Document Versions Relations
export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  createdBy: one(users, { fields: [documentVersions.createdById], references: [users.id] }),
}));

// Sticky Notes Relations
export const stickyNotesRelations = relations(stickyNotes, ({ one, many }) => ({
  author: one(users, { fields: [stickyNotes.createdById], references: [users.id] }),
  collaborators: many(noteCollaborators),
}));

// Note Collaborators Relations
export const noteCollaboratorsRelations = relations(noteCollaborators, ({ one }) => ({
  note: one(stickyNotes, { fields: [noteCollaborators.noteId], references: [stickyNotes.id] }),
  collaborator: one(users, { fields: [noteCollaborators.collaboratorId], references: [users.id] }),
}));

// Projects Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, { fields: [projects.createdById], references: [users.id] }),
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  tasks: many(tasks),
  collaborators: many(projectCollaborators),
}));

// Project Collaborators Relations
export const projectCollaboratorsRelations = relations(projectCollaborators, ({ one }) => ({
  project: one(projects, { fields: [projectCollaborators.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectCollaborators.collaboratorId], references: [users.id] }),
}));

// Tasks Relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignedTo: one(users, { fields: [tasks.assignedToId], references: [users.id] }),
  creator: one(users, { fields: [tasks.createdById], references: [users.id] }),
  comments: many(taskComments),
  activityLog: many(taskActivityLog),
}));

// Task Comments Relations
export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [taskComments.createdById], references: [users.id] }),
}));

// Task Activity Log Relations
export const taskActivityLogRelations = relations(taskActivityLog, ({ one }) => ({
  task: one(tasks, { fields: [taskActivityLog.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskActivityLog.userId], references: [users.id] }),
}));

// Users Relations - MOST IMPORTANT ONE!
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  notes: many(stickyNotes),
  collaborations: many(noteCollaborators),
  authoredEvents: many(events),
  eventComments: many(eventComments),
  eventLikes: many(eventLikes),
  createdProjects: many(projects),
  projectCollaborations: many(projectCollaborators),
  assignedTasks: many(tasks),
  createdTasks: many(tasks),
  taskComments: many(taskComments),
  taskActivities: many(taskActivityLog),
  organizationsOwned: many(organizations),
  organizationMemberships: many(organizationMembers),
  documents: many(documents),
  documentCollaborations: many(documentCollaborators),
  documentVersions: many(documentVersions),
}));

// Accounts Relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

// Sessions Relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

// Events Relations
export const eventsRelations = relations(events, ({ one, many }) => ({
  author: one(users, { fields: [events.createdById], references: [users.id] }),
  comments: many(eventComments),
  likes: many(eventLikes),
}));

// Event Comments Relations
export const eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(events, { fields: [eventComments.eventId], references: [events.id] }),
  author: one(users, { fields: [eventComments.createdById], references: [users.id] }),
}));

// Event Likes Relations
export const eventLikesRelations = relations(eventLikes, ({ one }) => ({
  event: one(events, { fields: [eventLikes.eventId], references: [events.id] }),
  user: one(users, { fields: [eventLikes.createdById], references: [users.id] }),
}));

// ===================
// ===== TYPE EXPORTS =====
// ===================

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;
export type TaskComment = InferSelectModel<typeof taskComments>;
export type NewTaskComment = InferInsertModel<typeof taskComments>;
export type ProjectCollaborator = InferSelectModel<typeof projectCollaborators>;
export type NewProjectCollaborator = InferInsertModel<typeof projectCollaborators>;
export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;
export type OrganizationMember = InferSelectModel<typeof organizationMembers>;
export type NewOrganizationMember = InferInsertModel<typeof organizationMembers>;
export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;
export type DocumentCollaborator = InferSelectModel<typeof documentCollaborators>;
export type NewDocumentCollaborator = InferInsertModel<typeof documentCollaborators>;
export type DocumentVersion = InferSelectModel<typeof documentVersions>;
export type NewDocumentVersion = InferInsertModel<typeof documentVersions>;