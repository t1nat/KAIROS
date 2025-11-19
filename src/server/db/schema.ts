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

// --- USER TABLE (Moved up for reference stability) ---
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
    image: d.varchar({ length: 255 }),
}));

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

    // Collaboration Field
    shareStatus: shareStatusEnum("share_status").notNull(),
  }),
  (t) => [
    index("note_created_by_idx").on(t.createdById),
  ]
);

// --- COLLABORATORS TABLE ---
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

// --- NEW: PROJECTS TABLE ---
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
  }),
  (t) => [
    index("project_created_by_idx").on(t.createdById),
  ]
);

// --- NEW: TASKS TABLE ---
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
    // Timeline positioning
    orderIndex: integer("order_index").notNull().default(0),
  }),
  (t) => [
    index("task_project_idx").on(t.projectId),
    index("task_assigned_to_idx").on(t.assignedToId),
    index("task_created_by_idx").on(t.createdById),
  ]
);

// --- NEW: PROJECT COLLABORATORS TABLE ---
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

// --- NEW: TASK COMMENTS TABLE ---
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

// --- NEW: TASK ACTIVITY LOG TABLE (for real-time updates) ---
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
    action: varchar("action", { length: 100 }).notNull(), // e.g., "status_changed", "assigned", "completed"
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

// --- RELATIONS ---
export const stickyNotesRelations = relations(stickyNotes, ({ one, many }) => ({
  author: one(users, { fields: [stickyNotes.createdById], references: [users.id] }),
  collaborators: many(noteCollaborators),
}));

export const noteCollaboratorsRelations = relations(noteCollaborators, ({ one }) => ({
  note: one(stickyNotes, { fields: [noteCollaborators.noteId], references: [stickyNotes.id] }),
  collaborator: one(users, { fields: [noteCollaborators.collaboratorId], references: [users.id] }),
}));

// NEW: Project Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, { fields: [projects.createdById], references: [users.id] }),
  tasks: many(tasks),
  collaborators: many(projectCollaborators),
}));

export const projectCollaboratorsRelations = relations(projectCollaborators, ({ one }) => ({
  project: one(projects, { fields: [projectCollaborators.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectCollaborators.collaboratorId], references: [users.id] }),
}));

// NEW: Task Relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignedTo: one(users, { fields: [tasks.assignedToId], references: [users.id] }),
  creator: one(users, { fields: [tasks.createdById], references: [users.id] }),
  comments: many(taskComments),
  activityLog: many(taskActivityLog),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  author: one(users, { fields: [taskComments.createdById], references: [users.id] }),
}));

export const taskActivityLogRelations = relations(taskActivityLog, ({ one }) => ({
  task: one(tasks, { fields: [taskActivityLog.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskActivityLog.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    notes: many(stickyNotes, { relationName: 'authored_notes' }),
    collaborations: many(noteCollaborators),
    authoredEvents: many(events),
    eventComments: many(eventComments),
    eventLikes: many(eventLikes),
    // NEW relations
    createdProjects: many(projects),
    projectCollaborations: many(projectCollaborators),
    assignedTasks: many(tasks, { relationName: 'assigned_tasks' }),
    createdTasks: many(tasks, { relationName: 'created_tasks' }),
    taskComments: many(taskComments),
    taskActivities: many(taskActivityLog),
}));

// --- EXISTING TABLES (POSTS, ACCOUNTS, SESSIONS, VERIFICATION TOKENS) ---

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

export type Event = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

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

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

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

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  author: one(users, { fields: [events.createdById], references: [users.id] }),
  comments: many(eventComments),
  likes: many(eventLikes),
}));

export const eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(events, { fields: [eventComments.eventId], references: [events.id] }),
  author: one(users, { fields: [eventComments.createdById], references: [users.id] }),
}));

export const eventLikesRelations = relations(eventLikes, ({ one }) => ({
  event: one(events, { fields: [eventLikes.eventId], references: [events.id] }),
  user: one(users, { fields: [eventLikes.createdById], references: [users.id] }),
}));

// --- TYPE EXPORTS for TypeScript ---
export type Project = InferSelectModel<typeof projects>;
export type NewProject = InferInsertModel<typeof projects>;
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;
export type TaskComment = InferSelectModel<typeof taskComments>;
export type NewTaskComment = InferInsertModel<typeof taskComments>;
export type ProjectCollaborator = InferSelectModel<typeof projectCollaborators>;
export type NewProjectCollaborator = InferInsertModel<typeof projectCollaborators>;