import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for the org translation keys that were added to es, de, fr.
 * Verifies all locales have the required org section keys.
 */

const localesDir = path.resolve(__dirname, "../../src/i18n/messages");
const locales = ["en", "bg", "es", "fr", "de"] as const;

function loadLocale(locale: string): Record<string, unknown> {
  const filePath = path.join(localesDir, `${locale}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

const requiredOrgKeys = ["organization", "personalWorkspace", "personalHint"];

describe("i18n org translation keys", () => {
  for (const locale of locales) {
    describe(`${locale}.json org section`, () => {
      let org: Record<string, unknown>;

      it("has an 'org' section", () => {
        const data = loadLocale(locale);
        expect(data).toHaveProperty("org");
        org = data.org as Record<string, unknown>;
      });

      for (const key of requiredOrgKeys) {
        it(`org.${key} exists and is a non-empty string`, () => {
          const data = loadLocale(locale);
          org = data.org as Record<string, unknown>;
          expect(org).toHaveProperty(key);
          expect(typeof org[key]).toBe("string");
          expect((org[key] as string).length).toBeGreaterThan(0);
        });
      }
    });
  }

  describe("Cross-locale consistency for org keys", () => {
    it("all locales have the required org keys", () => {
      for (const locale of locales) {
        const data = loadLocale(locale);
        const org = data.org as Record<string, unknown>;
        for (const key of requiredOrgKeys) {
          expect(org).toHaveProperty(key);
          expect(typeof org[key]).toBe("string");
        }
      }
    });
  });
});
