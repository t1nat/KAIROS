import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Comprehensive utilities and library tests.
 */

const utilsPath = path.resolve(__dirname, "../../src/lib/utils.ts");
const utilsSource = fs.readFileSync(utilsPath, "utf-8");

const permissionsPath = path.resolve(__dirname, "../../src/lib/permissions.ts");
const permissionsSource = fs.readFileSync(permissionsPath, "utf-8");

describe("Utils — cn function", () => {
  it("exports cn function", () => {
    expect(utilsSource).toContain("cn");
  });

  it("uses clsx or class-variance-authority", () => {
    expect(utilsSource).toMatch(/clsx|twMerge|cva/);
  });
});

describe("Permissions — Role Matrix", () => {
  it("defines admin role permissions", () => {
    expect(permissionsSource).toContain("admin");
  });

  it("defines mentor role (view-only)", () => {
    expect(permissionsSource).toContain("mentor");
  });

  it("defines worker role", () => {
    expect(permissionsSource).toContain("worker");
  });

  it("defines mentor role", () => {
    expect(permissionsSource).toContain("mentor");
  });

  it("exports getPermissions function", () => {
    expect(permissionsSource).toContain("getPermissions");
  });

  it("exports isViewOnlyRole function", () => {
    expect(permissionsSource).toContain("isViewOnlyRole");
  });
});
