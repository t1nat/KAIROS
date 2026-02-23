import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Tests for chat component changes — verify topbar opacity, 
 * full-width bubbles, and design token usage.
 */

const chatPath = path.resolve(__dirname, "../../src/components/projects/ProjectIntelligenceChat.tsx");
const chatSource = fs.readFileSync(chatPath, "utf-8");

const widgetPath = path.resolve(__dirname, "../../src/components/chat/A1ChatWidgetOverlay.tsx");
const widgetSource = fs.readFileSync(widgetPath, "utf-8");

describe("ProjectIntelligenceChat – Layout", () => {
  it("does not use max-w-3xl constraint on messages", () => {
    // Messages should fill full width, not be constrained to max-w-3xl
    expect(chatSource).not.toContain("max-w-3xl");
  });

  it("does not use bg-zinc-900 hardcoded background", () => {
    expect(chatSource).not.toContain("bg-zinc-900");
  });

  it("does not use bg-zinc-800 hardcoded background", () => {
    expect(chatSource).not.toContain("bg-zinc-800");
  });

  it("uses bg-bg-primary design token for main background", () => {
    expect(chatSource).toContain("bg-bg-primary");
  });

  it("uses bg-bg-elevated design token for elevated surfaces", () => {
    expect(chatSource).toContain("bg-bg-elevated");
  });

  it("message container uses w-full for full width", () => {
    expect(chatSource).toContain("w-full space-y-4");
  });
});

describe("A1ChatWidgetOverlay – Topbar", () => {
  it("topbar is fully opaque (no /70 opacity suffix)", () => {
    // Should use bg-bg-elevated, not bg-bg-elevated/70
    expect(widgetSource).not.toContain("bg-bg-elevated/70");
  });

  it("topbar uses bg-bg-elevated for background", () => {
    expect(widgetSource).toContain("bg-bg-elevated");
  });
});

describe("AiTaskPlannerPanel – Border Styling", () => {
  const panelPath = path.resolve(__dirname, "../../src/components/projects/AiTaskPlannerPanel.tsx");
  const panelSource = fs.readFileSync(panelPath, "utf-8");

  it("does not use border-border-light/20 (white outlines)", () => {
    expect(panelSource).not.toContain("border-border-light/20");
  });

  it("uses border-white/[0.06] for subtle borders", () => {
    expect(panelSource).toContain("border-white/[0.06]");
  });

  it("uses bg-bg-secondary for outer container", () => {
    expect(panelSource).toContain("bg-bg-secondary rounded-2xl");
  });

  it("does not use kairos-bg-surface class", () => {
    expect(panelSource).not.toContain("kairos-bg-surface");
  });

  it("does not use kairos-section-border class", () => {
    expect(panelSource).not.toContain("kairos-section-border");
  });
});
