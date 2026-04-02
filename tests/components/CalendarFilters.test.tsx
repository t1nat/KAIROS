import React from "react";
import { describe, expect, it } from "vitest";

function filterItems(items: any[], filters: {
  q: string;
  types: Set<string>;
  taskStatuses: Set<string>;
  priorities: Set<string>;
}) {
  const q = filters.q.trim().toLowerCase();
  return items.filter((item) => {
    if (!filters.types.has(item.kind)) return false;
    if (item.kind === "task") {
      if (!filters.taskStatuses.has(item.status)) return false;
      if (!filters.priorities.has(item.priority)) return false;
    }
    if (q.length > 0) {
      const hay = (
        item.kind === "task"
          ? `${item.title} ${item.projectTitle ?? ""}`
          : item.kind === "event"
            ? `${item.title} ${item.description ?? ""}`
            : `${item.title}`
      ).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

describe("Calendar filtering", () => {
  it("filters by type and status/priority", () => {
    const items = [
      { kind: "task", id: 1, title: "A", status: "pending", priority: "high", projectTitle: "P" },
      { kind: "task", id: 2, title: "B", status: "completed", priority: "low", projectTitle: null },
      { kind: "event", id: 3, title: "Launch", description: "" },
      { kind: "note", id: 4, title: "Idea" },
    ];

    const filtered = filterItems(items, {
      q: "",
      types: new Set(["task", "note"]),
      taskStatuses: new Set(["pending"]),
      priorities: new Set(["high"]),
    });

    expect(filtered.map((i) => i.id)).toEqual([1, 4]);
  });

  it("filters by search across kinds", () => {
    const items = [
      { kind: "task", id: 1, title: "Write docs", status: "pending", priority: "high", projectTitle: "Kairos" },
      { kind: "event", id: 2, title: "Demo", description: "Kairos showcase" },
      { kind: "note", id: 3, title: "Random" },
    ];

    const filtered = filterItems(items, {
      q: "kairos",
      types: new Set(["task", "event", "note"]),
      taskStatuses: new Set(["pending", "in_progress", "blocked", "completed"]),
      priorities: new Set(["urgent", "high", "medium", "low"]),
    });

    expect(filtered.map((i) => i.id)).toEqual([1, 2]);
  });
});
