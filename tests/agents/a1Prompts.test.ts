import { describe, it, expect } from "vitest";
import { getA1SystemPrompt } from "~/server/agents/prompts/a1Prompts";
import type { A1ContextPack } from "~/server/agents/context/a1ContextBuilder";

const mockContext: A1ContextPack = {
  session: {
    userId: "user-1",
    email: "alice@example.com",
    name: "Alice",
    activeOrganizationId: 1,
  },
  projects: [
    { id: 1, title: "Project Alpha", description: "First project", status: "active" },
  ],
  tasks: [
    { id: 1, title: "Fix bug", status: "todo", priority: "high", dueDate: null },
  ],
  notifications: [
    { id: 1, type: "info", title: "Welcome", message: "Hello!", read: false },
  ],
  now: new Date().toISOString(),
};

describe("A1 System Prompt — enhanced", () => {
  it("returns a non-empty string", () => {
    const prompt = getA1SystemPrompt(mockContext);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(100);
  });

  it("includes Workspace Concierge identity", () => {
    const prompt = getA1SystemPrompt(mockContext);
    expect(prompt.toLowerCase()).toContain("concierge");
  });

  it("includes warm / friendly tone guidance", () => {
    const prompt = getA1SystemPrompt(mockContext);
    expect(prompt.toLowerCase()).toContain("warm");
  });

  it("includes response formatting section", () => {
    const prompt = getA1SystemPrompt(mockContext);
    expect(prompt.toLowerCase()).toContain("formatting");
  });

  it("includes prioritize guidance", () => {
    const prompt = getA1SystemPrompt(mockContext);
    expect(prompt.toLowerCase()).toContain("prioriti");
  });

  it("includes project context", () => {
    const prompt = getA1SystemPrompt(mockContext);
    expect(prompt).toContain("Project Alpha");
  });

  it("handles empty arrays gracefully", () => {
    const empty: A1ContextPack = {
      ...mockContext,
      projects: [],
      tasks: [],
      notifications: [],
    };
    const prompt = getA1SystemPrompt(empty);
    expect(typeof prompt).toBe("string");
    expect(prompt.length).toBeGreaterThan(50);
  });
});
