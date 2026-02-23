import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * NotesList component tests — verify the glass UI has been removed
 * and replaced with proper design token classes.
 */

const notesListPath = path.resolve(__dirname, "../../src/components/notes/NotesList.tsx");
const notesListSource = fs.readFileSync(notesListPath, "utf-8");

describe("NotesList – Design Token Migration", () => {
  it("does not use kairos-font-body class", () => {
    expect(notesListSource).not.toContain("kairos-font-body");
  });

  it("does not use kairos-system-scroll class", () => {
    expect(notesListSource).not.toContain("kairos-system-scroll");
  });

  it("does not use kairos-settings-item class", () => {
    expect(notesListSource).not.toContain("kairos-settings-item");
  });

  it("does not use kairos-section-border class", () => {
    expect(notesListSource).not.toContain("kairos-section-border");
  });

  it("does not use kairos-system-card class", () => {
    expect(notesListSource).not.toContain("kairos-system-card");
  });

  it("does not use kairos-fg-primary class", () => {
    expect(notesListSource).not.toContain("kairos-fg-primary");
  });

  it("does not use kairos-fg-secondary class", () => {
    expect(notesListSource).not.toContain("kairos-fg-secondary");
  });

  it("does not use kairos-fg-tertiary class", () => {
    expect(notesListSource).not.toContain("kairos-fg-tertiary");
  });

  it("does not use kairos-active-state class", () => {
    expect(notesListSource).not.toContain("kairos-active-state");
  });

  it("does not use kairos-accent-primary class", () => {
    expect(notesListSource).not.toContain("kairos-accent-primary");
  });

  it("uses text-fg-primary for primary foreground", () => {
    expect(notesListSource).toContain("text-fg-primary");
  });

  it("uses text-fg-secondary for secondary foreground", () => {
    expect(notesListSource).toContain("text-fg-secondary");
  });

  it("uses bg-bg-secondary for card backgrounds", () => {
    expect(notesListSource).toContain("bg-bg-secondary");
  });

  it("uses bg-bg-tertiary for active states", () => {
    expect(notesListSource).toContain("bg-bg-tertiary");
  });

  it("uses text-accent-primary for accent text", () => {
    expect(notesListSource).toContain("text-accent-primary");
  });

  it("uses scrollbar-thin for scroll styling", () => {
    expect(notesListSource).toContain("scrollbar-thin");
  });

  it("uses border-white/[0.06] for subtle borders", () => {
    expect(notesListSource).toContain("border-white/[0.06]");
  });
});
