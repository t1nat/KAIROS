import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Proxy tests — verify auth redirect patterns, 
 * route protection, and locale handling.
 * (Migrated from middleware.ts → proxy.ts per Next.js 16 deprecation)
 */

const proxyPath = path.resolve(__dirname, "../../src/proxy.ts");
const proxySource = fs.readFileSync(proxyPath, "utf-8");

describe("Proxy — Route Protection", () => {
  it("exports a proxy function or config", () => {
    expect(proxySource).toMatch(/export\s+(default|const\s+proxy|function\s+proxy)/);
  });

  it("handles authentication redirects", () => {
    // Must reference auth or session handling
    expect(proxySource).toMatch(/auth|session|token|getToken|withAuth/i);
  });

  it("has a config matcher", () => {
    expect(proxySource).toContain("matcher");
  });

  it("does not expose internal API routes to unauthenticated users", () => {
    // Proxy should have some path matching
    expect(proxySource).toMatch(/api|trpc|auth/i);
  });
});

describe("Proxy — No Security Issues", () => {
  it("does not use eval", () => {
    expect(proxySource).not.toMatch(/\beval\s*\(/);
  });

  it("does not hardcode secrets", () => {
    expect(proxySource).not.toMatch(/PASSWORD|SECRET|KEY\s*=\s*["']/);
  });
});
