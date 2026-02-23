import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Page animation tests — verify that all page components
 * include the kairos-page-enter animation class.
 */

const pagesDir = path.resolve(__dirname, "../../src/app");

const pageFiles = [
  "create/page.tsx",
  "projects/page.tsx",
  "progress/page.tsx",
  "publish/page.tsx",
  "orgs/page.tsx",
  "settings/page.tsx",
  "chat/page.tsx",
  "not-found.tsx",
];

describe("Page animations", () => {
  for (const pageFile of pageFiles) {
    const fullPath = path.join(pagesDir, pageFile);

    it(`${pageFile} includes kairos-page-enter class`, () => {
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content).toContain("kairos-page-enter");
    });
  }

  it("HomeClient has GSAP reveal animations", () => {
    const homeClientPath = path.resolve(
      __dirname,
      "../../src/components/homepage/HomeClient.tsx",
    );
    const content = fs.readFileSync(homeClientPath, "utf-8");
    expect(content).toContain("data-reveal");
    expect(content).toContain("gsap.fromTo");
  });

  it("HomeClient imports gsap and ScrollTrigger", () => {
    const homeClientPath = path.resolve(
      __dirname,
      "../../src/components/homepage/HomeClient.tsx",
    );
    const content = fs.readFileSync(homeClientPath, "utf-8");
    expect(content).toContain("import { gsap }");
    expect(content).toContain("import { ScrollTrigger }");
  });
});
