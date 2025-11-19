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

// --- COLLABORATORS TABLE (FIX: UNCOMMENTED) ---
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

// --- RELATIONS (Now all tables are defined) ---
export const stickyNotesRelations = relations(stickyNotes, ({ one, many }) => ({
  author: one(users, { fields: [stickyNotes.createdById], references: [users.id] }),
  collaborators: many(noteCollaborators),
}));

export const noteCollaboratorsRelations = relations(noteCollaborators, ({ one }) => ({
  note: one(stickyNotes, { fields: [noteCollaborators.noteId], references: [stickyNotes.id] }),
  collaborator: one(users, { fields: [noteCollaborators.collaboratorId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    accounts: many(accounts),
    notes: many(stickyNotes, { relationName: 'authored_notes' }),
    collaborations: many(noteCollaborators),
    authoredEvents: many(events),
    eventComments: many(eventComments),
    eventLikes: many(eventLikes),
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
    description: d.text("description").notNull(), // Detailed event info
    eventDate: d.timestamp("event_date", { mode: "date", withTimezone: true }).notNull(), // When the event happens
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
    primaryKey({ columns: [t.eventId, t.createdById] }), // A user can only like an event once
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

