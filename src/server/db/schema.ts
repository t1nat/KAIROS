
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
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";
import crypto from "node:crypto";

export const createTable = pgTableCreator((name) => name); 

export const shareStatusEnum = pgEnum("share_status", ['private', 'shared_read', 'shared_write']);
export const permissionEnum = pgEnum("permission", ['read', 'write']);
export const taskStatusEnum = pgEnum("task_status", ['pending', 'in_progress', 'completed', 'blocked']);
export const taskPriorityEnum = pgEnum("task_priority", ['low', 'medium', 'high', 'urgent']);
export const usageModeEnum = pgEnum("usage_mode", ["personal", "organization"]);
export const orgRoleEnum = pgEnum("org_role", ["admin", "worker", "mentor"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);
export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);
export const languageEnum = pgEnum("language", ["en", "bg", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar"]);
export const dateFormatEnum = pgEnum("date_format", ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]);
export const notificationTypeEnum = pgEnum("notification_type", ["event", "task", "project", "system"]);
export const rsvpStatusEnum = pgEnum("rsvp_status", ["going", "maybe", "not_going"]);
export const regionEnum = pgEnum("region", [
  "sofia", 
  "plovdiv", 
  "varna", 
  "burgas", 
  "ruse", 
  "stara_zagora", 
  "pleven", 
  "sliven", 
  "dobrich", 
  "shumen"
]);


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
    image: d.text(),
    usageMode: usageModeEnum("usage_mode"),
    activeOrganizationId: integer("active_organization_id"),
    password: varchar("password", { length: 255 }),

    // Secret reset PIN (hashed) + hint
    resetPinHash: varchar("reset_pin_hash", { length: 255 }),
    resetPinHint: text("reset_pin_hint"),

    // PIN-based lockout / rate limiting
    resetPinFailedAttempts: integer("reset_pin_failed_attempts").notNull().default(0),
    resetPinLockedUntil: timestamp("reset_pin_locked_until", { mode: "date", withTimezone: true }),
    resetPinLastFailedAt: timestamp("reset_pin_last_failed_at", { mode: "date", withTimezone: true }),
    
    bio: text("bio"),
    
    emailNotifications: boolean("email_notifications").default(true).notNull(),
    projectUpdatesNotifications: boolean("project_updates_notifications").default(true).notNull(),
    eventRemindersNotifications: boolean("event_reminders_notifications").default(false).notNull(),
    taskDueRemindersNotifications: boolean("task_due_reminders_notifications").default(true).notNull(),
    marketingEmailsNotifications: boolean("marketing_emails_notifications").default(false).notNull(),
    
    language: languageEnum("language").default("en").notNull(),
    timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
    dateFormat: dateFormatEnum("date_format").default("MM/DD/YYYY").notNull(),
    
    
    theme: themeEnum("theme").default("dark").notNull(),
    accentColor: varchar("accent_color", { length: 20 }).default("purple").notNull(),

    // Notes
    notesKeepUnlockedUntilClose: boolean("notes_keep_unlocked_until_close").default(false).notNull(),
    
    profileVisibility: boolean("profile_visibility").default(true).notNull(),
    showOnlineStatus: boolean("show_online_status").default(true).notNull(),
    activityTracking: boolean("activity_tracking").default(false).notNull(),
    dataCollection: boolean("data_collection").default(false).notNull(),
    
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorSecret: varchar("two_factor_secret", { length: 255 }),
    
    createdAt: timestamp("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
}));
export type UserSettings = {
  name: string | null;
  bio: string | null;
  image: string | null;
  
  emailNotifications: boolean;
  projectUpdatesNotifications: boolean;
  eventRemindersNotifications: boolean;
  taskDueRemindersNotifications: boolean;
  marketingEmailsNotifications: boolean;
  
  language: "en" | "bg" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh" | "ar";
  timezone: string;
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
  

  theme: "light" | "dark" | "system";
  accentColor: string;
  
  profileVisibility: boolean;
  showOnlineStatus: boolean;
  activityTracking: boolean;
  dataCollection: boolean;
  
  twoFactorEnabled: boolean;

  notesKeepUnlockedUntilClose: boolean;
};

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
    canAddMembers: boolean("can_add_members").default(false).notNull(),
    canAssignTasks: boolean("can_assign_tasks").default(false).notNull(),
    joinedAt: timestamp("joined_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("org_member_org_idx").on(t.organizationId),
    index("org_member_user_idx").on(t.userId),
  ]
);

export const projects = createTable(
  "projects",
  (d) => ({
    id: serial("id").primaryKey(),
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
    completedById: d
      .varchar("completed_by_id", { length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastEditedById: d
      .varchar("last_edited_by_id", { length: 255 })
      .references(() => users.id, { onDelete: "set null" }),
    lastEditedAt: timestamp("last_edited_at", { mode: "date", withTimezone: true }),
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
    index("task_completed_by_idx").on(t.completedById),
    index("task_last_edited_by_idx").on(t.lastEditedById),
  ]
);



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

    shareStatus: shareStatusEnum("share_status").notNull(),
  }),
  (t) => [
    index("note_created_by_idx").on(t.createdById),
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


export const directConversations = createTable(
  "direct_conversations",
  (d) => ({
    id: d.serial("id").primaryKey(),
    projectId: d.integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
    organizationId: d.integer("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    userOneId: d
      .varchar("user_one_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userTwoId: d
      .varchar("user_two_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastMessageAt: d.timestamp("last_message_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    createdAt: d.timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: d.timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("direct_convo_project_idx").on(t.projectId),
    index("direct_convo_org_idx").on(t.organizationId),
    index("direct_convo_user_one_idx").on(t.userOneId),
    index("direct_convo_user_two_idx").on(t.userTwoId),
  ]
);

export const directMessages = createTable(
  "direct_messages",
  (d) => ({
    id: d.serial("id").primaryKey(),
    conversationId: d
      .integer("conversation_id")
      .notNull()
      .references(() => directConversations.id, { onDelete: "cascade" }),
    senderId: d
      .varchar("sender_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: d.text("body").notNull(),
    createdAt: d.timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  }),
  (t) => [
    index("direct_msg_conversation_idx").on(t.conversationId),
    index("direct_msg_sender_idx").on(t.senderId),
    index("direct_msg_created_idx").on(t.createdAt),
  ]
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

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const events = createTable(
  "event",
  (d) => ({
    id: d.serial("id").primaryKey(),
    title: d.varchar("title", { length: 256 }).notNull(),
    description: d.text("description").notNull(),
    imageUrl: d.text("image_url"),
    eventDate: d.timestamp("event_date", { mode: "date", withTimezone: true }).notNull(),
    region: regionEnum("region").notNull(),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    enableRsvp: d.boolean("enable_rsvp").notNull().default(false),
    sendReminders: d.boolean("send_reminders").notNull().default(false),
    reminderSent: d.boolean("reminder_sent").notNull().default(false),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("event_created_by_idx").on(t.createdById),
    index("event_date_idx").on(t.eventDate),
    index("event_region_idx").on(t.region),
  ],
);

export const eventRsvps = createTable(
  "event_rsvp",
  (d) => ({
    id: d.serial("id").primaryKey(),
    eventId: d
      .integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("rsvp_event_idx").on(t.eventId),
    index("rsvp_user_idx").on(t.userId),
    index("rsvp_unique").on(t.eventId, t.userId),
  ]
);

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

export const notifications = createTable(
  "notifications",
  (d) => ({
    id: d.serial("id").primaryKey(),
    userId: d
      .varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: d.varchar("title", { length: 256 }).notNull(),
    message: d.text("message").notNull(),
    link: d.varchar("link", { length: 512 }),
    read: d.boolean("read").notNull().default(false),
    createdAt: d
      .timestamp("created_at", { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("notification_user_idx").on(t.userId),
    index("notification_read_idx").on(t.read),
    index("notification_created_idx").on(t.createdAt),
  ]
);


export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, { fields: [organizations.createdById], references: [users.id] }),
  members: many(organizationMembers),
  projects: many(projects),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const stickyNotesRelations = relations(stickyNotes, ({ one }) => ({
  author: one(users, { fields: [stickyNotes.createdById], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, { fields: [projects.createdById], references: [users.id] }),
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  tasks: many(tasks),
  collaborators: many(projectCollaborators),
}));

export const projectCollaboratorsRelations = relations(projectCollaborators, ({ one }) => ({
  project: one(projects, { fields: [projectCollaborators.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectCollaborators.collaboratorId], references: [users.id] }),
}));

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


export const directConversationsRelations = relations(directConversations, ({ one, many }) => ({
  project: one(projects, { fields: [directConversations.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [directConversations.organizationId], references: [organizations.id] }),
  userOne: one(users, { fields: [directConversations.userOneId], references: [users.id] }),
  userTwo: one(users, { fields: [directConversations.userTwoId], references: [users.id] }),
  messages: many(directMessages),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  conversation: one(directConversations, { fields: [directMessages.conversationId], references: [directConversations.id] }),
  sender: one(users, { fields: [directMessages.senderId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  notes: many(stickyNotes),
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
  notifications: many(notifications),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  author: one(users, { fields: [events.createdById], references: [users.id] }),
  comments: many(eventComments),
  likes: many(eventLikes),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, { fields: [eventRsvps.eventId], references: [events.id] }),
  user: one(users, { fields: [eventRsvps.userId], references: [users.id] }),
}));

export const eventCommentsRelations = relations(eventComments, ({ one }) => ({
  event: one(events, { fields: [eventComments.eventId], references: [events.id] }),
  author: one(users, { fields: [eventComments.createdById], references: [users.id] }),
}));

export const eventLikesRelations = relations(eventLikes, ({ one }) => ({
  event: one(events, { fields: [eventLikes.eventId], references: [events.id] }),
  user: one(users, { fields: [eventLikes.createdById], references: [users.id] }),
}));


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
export type Notification = InferSelectModel<typeof notifications>;
export type NewNotification = InferInsertModel<typeof notifications>;


export type EventRsvp = InferSelectModel<typeof eventRsvps>;
export type NewEventRsvp = InferInsertModel<typeof eventRsvps>;

export type DirectConversation = InferSelectModel<typeof directConversations>;
export type NewDirectConversation = InferInsertModel<typeof directConversations>;
export type DirectMessage = InferSelectModel<typeof directMessages>;
export type NewDirectMessage = InferInsertModel<typeof directMessages>;
