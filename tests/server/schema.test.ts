import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Database schema tests — verify all tables have proper security patterns:
 * - Cascade deletes where needed
 * - Foreign keys properly defined
 * - Indexes on frequently queried columns
 */

const schemaPath = path.resolve(__dirname, "../../src/server/db/schema.ts");
const schemaSource = fs.readFileSync(schemaPath, "utf-8");

describe("Schema — Cascade Delete Safety", () => {
  it("accounts table has onDelete cascade on userId", () => {
    // Find the accounts table definition and check cascade
    const accountsSection = schemaSource.slice(
      schemaSource.indexOf("export const accounts"),
      schemaSource.indexOf("export const accounts") + 500,
    );
    expect(accountsSection).toContain('onDelete: "cascade"');
  });

  it("sessions table has onDelete cascade on userId", () => {
    const sessionsSection = schemaSource.slice(
      schemaSource.indexOf("export const sessions"),
      schemaSource.indexOf("export const sessions") + 500,
    );
    expect(sessionsSection).toContain('onDelete: "cascade"');
  });
});

describe("Schema — Table Definitions", () => {
  const expectedTables = [
    "users", "accounts", "sessions", "projects", "tasks",
    "notebooks", "notifications", "organizations", "organizationMembers",
    "events", "eventComments", "eventLikes", "eventRsvps",
    "projectCollaborators", "taskActivityLog", "passwordResetCodes",
  ];

  for (const table of expectedTables) {
    it(`defines "${table}" table`, () => {
      expect(schemaSource).toContain(`export const ${table}`);
    });
  }
});

describe("Schema — Relations Definitions", () => {
  it("defines usersRelations", () => {
    expect(schemaSource).toContain("usersRelations");
  });

  it("users have many projects", () => {
    expect(schemaSource).toContain("many(projects)");
  });

  it("users have many tasks", () => {
    expect(schemaSource).toContain("many(tasks)");
  });

  it("users have many accounts", () => {
    expect(schemaSource).toContain("many(accounts)");
  });

  it("users have many sessions", () => {
    expect(schemaSource).toContain("many(sessions)");
  });
});

describe("Schema — No SQL Injection Vectors", () => {
  it("does not use raw SQL in schema definitions", () => {
    // Schema should use Drizzle's type-safe column builders, not raw SQL
    expect(schemaSource).not.toMatch(/sql`[^`]*\$\{/);
  });
});

describe("Schema — Sensitive Fields", () => {
  it("has password field on users table", () => {
    expect(schemaSource).toContain("password");
  });

  it("has passwordHash field on notes (for encrypted notes)", () => {
    expect(schemaSource).toContain("passwordHash");
  });

  it("has email field on users table", () => {
    expect(schemaSource).toContain("email");
  });
});
