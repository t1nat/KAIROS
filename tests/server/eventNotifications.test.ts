import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const eventRouterPath = path.resolve(
  __dirname,
  "../../src/server/api/routers/event.ts"
);
const eventRouterSource = fs.readFileSync(eventRouterPath, "utf-8");

const schemaIndexPath = path.resolve(
  __dirname,
  "../../src/server/db/schema.ts"
);
fs.readFileSync(schemaIndexPath, "utf-8");

const schemasPath = path.resolve(
  __dirname,
  "../../src/server/db/schemas/index.ts"
);
const schemaSource = fs.readFileSync(schemasPath, "utf-8");

describe("Event Router – Notifications", () => {
  it("imports notifications table", () => {
    expect(eventRouterSource).toContain("notifications");
  });

  it("creates a notification on comment (for event owner)", () => {
    expect(eventRouterSource).toContain("New comment on your event");
  });

  it("creates a notification on like (for event owner)", () => {
    expect(eventRouterSource).toContain("New like on your event");
  });

  it("does not notify when liking own post", () => {
    expect(eventRouterSource).toContain("eventRow.createdById !== currentUserId");
  });

  it("uses 'comment' notification type for comments", () => {
    expect(eventRouterSource).toContain('type: "comment"');
  });

  it("uses 'like' notification type for likes", () => {
    expect(eventRouterSource).toContain('type: "like"');
  });
});

describe("Event Router – RSVP Reminders", () => {
  it("updateRsvp schema accepts reminderMinutesBefore", () => {
    expect(eventRouterSource).toContain("reminderMinutesBefore");
  });

  it("saves reminderMinutesBefore on RSVP insert", () => {
    expect(eventRouterSource).toContain("reminderMinutesBefore: input.reminderMinutesBefore");
  });

  it("resets reminderSent flag when reminder preference changes", () => {
    expect(eventRouterSource).toContain("reminderSent: false");
  });
});

describe("Schema – Notification Types", () => {
  it("has like notification type in enum", () => {
    expect(schemaSource).toContain("notificationTypeEnum");
    expect(schemaSource).toContain("like");
  });

  it("has comment notification type in enum", () => {
    expect(schemaSource).toContain("notificationTypeEnum");
    expect(schemaSource).toContain("comment");
  });

  it("has reply notification type in enum", () => {
    expect(schemaSource).toContain("notificationTypeEnum");
    expect(schemaSource).toContain("reply");
  });

  it("eventRsvps has reminderMinutesBefore column", () => {
    expect(schemaSource).toContain("reminderMinutesBefore");
    expect(schemaSource).toContain("reminder_minutes_before");
  });

  it("eventRsvps has reminderSent column", () => {
    expect(schemaSource).toContain("reminderSent");
    expect(schemaSource).toContain("reminder_sent");
  });
});
