import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests verifying auth config has the correct settings.
 * Specifically checks that allowDangerousEmailAccountLinking is enabled
 * for the Google provider (fixes OAuthAccountNotLinked in Edge).
 */

const authConfigPath = path.resolve(
  __dirname,
  "../../src/server/auth/config.ts"
);
const authConfigSource = fs.readFileSync(authConfigPath, "utf-8");

describe("Auth Config", () => {
  it("has allowDangerousEmailAccountLinking set to true", () => {
    expect(authConfigSource).toContain("allowDangerousEmailAccountLinking: true");
  });

  it("does not have allowDangerousEmailAccountLinking set to false", () => {
    expect(authConfigSource).not.toContain(
      "allowDangerousEmailAccountLinking: false"
    );
  });

  it("uses Google provider", () => {
    expect(authConfigSource).toContain("Google");
  });

  it("uses Credentials provider", () => {
    expect(authConfigSource).toContain("Credentials");
  });

  it("uses JWT session strategy", () => {
    expect(authConfigSource).toContain("jwt");
  });
});
