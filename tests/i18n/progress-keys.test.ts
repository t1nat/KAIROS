import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for i18n progress keys — verify activityTrend and createdVsCompleted
 * exist in all locale files.
 */

const locales = ["en", "bg", "de", "es", "fr"];
const messagesDir = path.resolve(__dirname, "../../src/i18n/messages");

describe("i18n Progress Keys", () => {
  for (const locale of locales) {
    describe(`${locale}.json`, () => {
      const filePath = path.join(messagesDir, `${locale}.json`);
      const raw = fs.readFileSync(filePath, "utf-8");
      const messages = JSON.parse(raw) as Record<string, unknown>;
      const progress = messages.progress as Record<string, unknown>;

      it("has progress section", () => {
        expect(progress).toBeDefined();
        expect(typeof progress).toBe("object");
      });

      it("has activityTrend.title", () => {
        const activityTrend = progress.activityTrend as Record<string, unknown>;
        expect(activityTrend).toBeDefined();
        expect(typeof activityTrend.title).toBe("string");
        expect((activityTrend.title as string).length).toBeGreaterThan(0);
      });

      it("has activityTrend.subtitle", () => {
        const activityTrend = progress.activityTrend as Record<string, unknown>;
        expect(typeof activityTrend.subtitle).toBe("string");
        expect((activityTrend.subtitle as string).length).toBeGreaterThan(0);
      });

      it("has createdVsCompleted.title", () => {
        const createdVsCompleted = progress.createdVsCompleted as Record<string, unknown>;
        expect(createdVsCompleted).toBeDefined();
        expect(typeof createdVsCompleted.title).toBe("string");
        expect((createdVsCompleted.title as string).length).toBeGreaterThan(0);
      });

      it("has createdVsCompleted.subtitle", () => {
        const createdVsCompleted = progress.createdVsCompleted as Record<string, unknown>;
        expect(typeof createdVsCompleted.subtitle).toBe("string");
        expect((createdVsCompleted.subtitle as string).length).toBeGreaterThan(0);
      });
    });
  }
});
