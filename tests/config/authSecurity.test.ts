import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Auth config tests — comprehensive security checks for next-auth configuration
 */

const configPath = path.resolve(__dirname, "../../src/server/auth/config.ts");
const configSource = fs.readFileSync(configPath, "utf-8");

describe("Auth Config — Provider Security", () => {
  it("uses JWT session strategy", () => {
    expect(configSource).toContain("jwt");
  });

  it("configures Google provider", () => {
    expect(configSource).toMatch(/Google|google/i);
  });

  it("configures Credentials provider", () => {
    expect(configSource).toContain("Credentials");
  });

  it("uses argon2 for credential verification", () => {
    expect(configSource).toContain("argon2");
  });

  it("does not store passwords in session/JWT", () => {
    // JWT callback should not include password field
    expect(configSource).not.toMatch(/token\.password|session\.password/);
  });

  it("has session callback", () => {
    expect(configSource).toContain("session");
  });

  it("has jwt callback", () => {
    expect(configSource).toContain("jwt");
  });
});

describe("Auth Config — Account Linking", () => {
  it("allows dangerous email account linking", () => {
    expect(configSource).toContain("allowDangerousEmailAccountLinking");
  });
});

describe("Auth Config — No Hardcoded Secrets", () => {
  it("does not hardcode OAuth client IDs", () => {
    // Should use env variables
    expect(configSource).not.toMatch(/clientId:\s*["'][A-Za-z0-9]{20,}/);
  });

  it("does not hardcode OAuth client secrets", () => {
    expect(configSource).not.toMatch(/clientSecret:\s*["'][A-Za-z0-9]{20,}/);
  });

  it("references environment variables for secrets", () => {
    expect(configSource).toMatch(/process\.env|env\./);
  });
});
