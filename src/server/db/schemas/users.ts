import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import {
  index,
  primaryKey,
  text,
  timestamp,
  varchar,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import type { AdapterAccount } from "next-auth/adapters";
import crypto from "node:crypto";
import {
  createTable,
  usageModeEnum,
  languageEnum,
  dateFormatEnum,
  themeEnum,
} from "./enums";

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

    resetPinHash: varchar("reset_pin_hash", { length: 255 }),
    resetPinHint: text("reset_pin_hint"),

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

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
      .references(() => users.id, { onDelete: "cascade" }),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("session_user_idx").on(t.userId)],
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

export const passwordResetCodes = createTable("password_reset_code", (d) => ({
  id: d
    .integer()
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  email: d.varchar({ length: 255 }).notNull(),
  code: d.varchar({ length: 8 }).notNull(),
  expiresAt: d
    .timestamp("expires_at", { mode: "date", withTimezone: true })
    .notNull(),
  used: d.boolean().default(false).notNull(),
  createdAt: d
    .timestamp("created_at", { mode: "date", withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
