import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Font configuration tests — verify the app uses Inter font globally.
 */

describe("Font configuration", () => {
  it("layout.tsx imports Nunito_Sans font", () => {
    const layoutPath = path.resolve(__dirname, "../../src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).toContain("Nunito_Sans");
    expect(content).toMatch(/import.*Nunito_Sans/);
  });

  it("layout.tsx no longer imports Space_Grotesk", () => {
    const layoutPath = path.resolve(__dirname, "../../src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    expect(content).not.toContain("Space_Grotesk");
  });

  it("layout.tsx applies font variable to body", () => {
    const layoutPath = path.resolve(__dirname, "../../src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    // Should reference the font variable
    expect(content).toContain("--font-geist-sans");
  });

  it("globals.css references the font variable", () => {
    const cssPath = path.resolve(__dirname, "../../src/styles/globals.css");
    const content = fs.readFileSync(cssPath, "utf-8");
    expect(content).toContain("--font-geist-sans");
  });
});
