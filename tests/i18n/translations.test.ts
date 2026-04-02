import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * i18n translation tests — verify all locale files have
 * the required keys and are valid JSON.
 */

const localesDir = path.resolve(__dirname, "../../src/i18n/messages");
const locales = ["en", "bg", "es", "fr", "de"] as const;

function loadLocale(locale: string): Record<string, unknown> {
  const filePath = path.join(localesDir, `${locale}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Record<string, unknown>;
}

/** Expected keys in the "home" section */
const requiredHomeKeys = [
  "title",
  "subtitle",
  "description",
  "getStarted",
  "signIn",
  "enterProjectSpace",
  "viewPublications",
  "aboutHeadline",
  "aboutSubtitle",
  "whyTeams",
  "streamlinedWorkflow",
  "streamlinedWorkflowDesc",
  "beautifulPublications",
  "beautifulPublicationsDesc",
  "secureReliable",
  "secureReliableDesc",
  "smartScheduling",
  "smartSchedulingDesc",
  "heroTagline",
  "trustedBy",
];

describe("i18n locale files", () => {
  for (const locale of locales) {
    describe(`${locale}.json`, () => {
      let data: Record<string, unknown>;

      it("is valid JSON", () => {
        const filePath = path.join(localesDir, `${locale}.json`);
        const raw = fs.readFileSync(filePath, "utf-8");
        expect(() => JSON.parse(raw) as unknown).not.toThrow();
        data = JSON.parse(raw) as Record<string, unknown>;
      });

      it("has a 'home' section", () => {
        data = loadLocale(locale);
        expect(data).toHaveProperty("home");
        expect(typeof data.home).toBe("object");
      });

      for (const key of requiredHomeKeys) {
        it(`home.${key} exists and is a non-empty string`, () => {
          data = loadLocale(locale);
          const home = data.home as Record<string, unknown>;
          expect(home).toHaveProperty(key);
          expect(typeof home[key]).toBe("string");
          expect((home[key] as string).length).toBeGreaterThan(0);
        });
      }

      it("all home values are strings (no nested objects)", () => {
        data = loadLocale(locale);
        const home = data.home as Record<string, unknown>;
        for (const [k, v] of Object.entries(home)) {
          expect(typeof v).toBe("string");
          if (typeof v !== "string") {
            throw new Error(`home.${k} in ${locale}.json is not a string`);
          }
        }
      });
    });
  }

  describe("Cross-locale consistency", () => {
    it("all locales have the same home keys", () => {
      const enHome = loadLocale("en").home as Record<string, unknown>;
      const enKeys = Object.keys(enHome).sort();

      for (const locale of locales) {
        if (locale === "en") continue;
        const localeHome = loadLocale(locale).home as Record<string, unknown>;
        const localeKeys = Object.keys(localeHome).sort();
        expect(localeKeys).toEqual(enKeys);
      }
    });

    it("no locale has empty string values in home", () => {
      for (const locale of locales) {
        const home = loadLocale(locale).home as Record<string, unknown>;
        for (const [k, v] of Object.entries(home)) {
          expect((v as string).trim().length).toBeGreaterThan(0);
          if ((v as string).trim().length === 0) {
            throw new Error(`home.${k} in ${locale}.json is empty`);
          }
        }
      }
    });
  });
});
