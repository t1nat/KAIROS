import { describe, it, expect } from "vitest";
import { a4EventsPublisherProfile } from "~/server/agents/profiles/a4EventsPublisher";

describe("A4 Events Publisher Profile", () => {
  it("has correct agent id", () => {
    expect(a4EventsPublisherProfile.id).toBe("events_publisher");
  });

  it("has correct agent name", () => {
    expect(a4EventsPublisherProfile.name).toBe("Events Publisher");
  });

  it("has a non-empty description", () => {
    expect(a4EventsPublisherProfile.description.length).toBeGreaterThan(0);
  });

  it("has read-only draft tool allowlist", () => {
    expect(a4EventsPublisherProfile.draftToolAllowlist).toEqual([
      "listEventsPublic",
      "getEventDetail",
    ]);
  });

  it("has correct apply tool allowlist", () => {
    const expected = [
      "createEvent",
      "updateEvent",
      "deleteEvent",
      "addEventComment",
      "deleteEventComment",
      "setEventRsvp",
      "toggleEventLike",
    ];
    expect(a4EventsPublisherProfile.applyToolAllowlist).toEqual(expected);
  });

  it("draft tools are all read-only (no mutations)", () => {
    const mutationPrefixes = ["create", "update", "delete", "add", "remove", "set", "toggle"];
    for (const tool of a4EventsPublisherProfile.draftToolAllowlist) {
      const lowerTool = tool.toLowerCase();
      for (const prefix of mutationPrefixes) {
        expect(lowerTool.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("apply tools include all mutation verbs", () => {
    const tools = a4EventsPublisherProfile.applyToolAllowlist;
    expect(tools.some((t) => t.startsWith("create"))).toBe(true);
    expect(tools.some((t) => t.startsWith("update"))).toBe(true);
    expect(tools.some((t) => t.startsWith("delete"))).toBe(true);
    expect(tools.some((t) => t.startsWith("add"))).toBe(true);
    expect(tools.some((t) => t.startsWith("set"))).toBe(true);
    expect(tools.some((t) => t.startsWith("toggle"))).toBe(true);
  });

  it("outputSchema is defined", () => {
    expect(a4EventsPublisherProfile.outputSchema).toBeDefined();
    // Verify it can parse a minimal valid plan
    const result = a4EventsPublisherProfile.outputSchema.safeParse({
      agentId: "events_publisher",
      summary: "Test plan",
    });
    expect(result.success).toBe(true);
  });
});
