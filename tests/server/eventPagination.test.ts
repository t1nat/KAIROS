import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Phase 2.B – Event pagination
 *
 * These tests are static/source-based (like other server tests in this repo).
 * They verify cursor-based pagination (limit=10) and stable ordering,
 * plus that comments are still fetched in bulk for the paged ids (no N+1).
 */

describe("Event Router – Public Events Pagination", () => {
  const eventRouterPath = path.resolve(__dirname, "../../src/server/api/routers/event.ts");
  const source = fs.readFileSync(eventRouterPath, "utf-8");

  it("getPublicEvents is a cursor-based paginated procedure", () => {
    expect(source).toContain("getPublicEvents");
    expect(source).toContain("cursor");
    expect(source).toContain("limit");
    // Cursor fields used for stable ordering
    expect(source).toContain("createdAt");
    expect(source).toContain("events.id");
  });

  it("defaults to limit=10 and uses limit + 1 lookahead", () => {
    expect(source).toMatch(/const\s+limit\s*=\s*input\?\.limit\s*\?\?\s*10/);
    expect(source).toMatch(/\.limit\(limit\s*\+\s*1\)/);
  });

  it("keeps ordering stable (createdAt desc, id desc)", () => {
    expect(source).toMatch(/orderBy\(desc\(events\.createdAt\),\s*desc\(events\.id\)\)/);
  });

  it("returns { items, nextCursor } payload", () => {
    expect(source).toContain("return { items, nextCursor }");
    expect(source).toContain("nextCursor");
    expect(source).toContain("items");
  });

  it("fetches comments for the paged event ids in one query (no N+1)", () => {
    // Ensure the implementation does a batched comment fetch with inArray(eventIds)
    expect(source).toContain("inArray(eventComments.eventId, eventIds)");
  });
});
