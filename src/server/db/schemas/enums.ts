import { pgTableCreator, pgEnum } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => name);

export const shareStatusEnum = pgEnum("share_status", ['private', 'shared_read', 'shared_write']);
export const permissionEnum = pgEnum("permission", ['read', 'write']);
export const taskStatusEnum = pgEnum("task_status", ['pending', 'in_progress', 'completed', 'blocked']);
export const taskPriorityEnum = pgEnum("task_priority", ['low', 'medium', 'high', 'urgent']);
export const usageModeEnum = pgEnum("usage_mode", ["personal", "organization"]);
export const orgRoleEnum = pgEnum("org_role", ["admin", "member", "guest", "worker", "mentor"]);
export const projectStatusEnum = pgEnum("project_status", ["active", "archived"]);
export const themeEnum = pgEnum("theme", ["light", "dark", "system"]);
export const languageEnum = pgEnum("language", ["en", "bg", "es", "fr", "de", "it", "pt", "ja", "ko", "zh", "ar"]);
export const dateFormatEnum = pgEnum("date_format", ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]);
export const notificationTypeEnum = pgEnum("notification_type", ["event", "task", "project", "system", "like", "comment", "reply"]);
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
export const agentTaskPlannerDraftStatusEnum = pgEnum(
  "agent_task_planner_draft_status",
  ["draft", "confirmed", "applied", "expired"] as const,
);
export const agentNotesVaultDraftStatusEnum = pgEnum(
  "agent_notes_vault_draft_status",
  ["draft", "confirmed", "applied", "expired"] as const,
);
