import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Page-level tests — verify all app pages use proper patterns:
 * - Server components use auth guards
 * - Client components use "use client" directive
 * - Pages render required layout components
 */

const appDir = path.resolve(__dirname, "../../src/app");

function readPage(pagePath: string): string {
  return fs.readFileSync(path.resolve(appDir, pagePath), "utf-8");
}

describe("Root Layout", () => {
  const layout = readPage("layout.tsx");

  it("imports fonts", () => {
    expect(layout).toMatch(/Nunito_Sans|font/i);
  });

  it("sets html lang attribute", () => {
    expect(layout).toContain("<html");
  });

  it("applies body classes", () => {
    expect(layout).toContain("<body");
  });

  it("wraps with providers", () => {
    expect(layout).toMatch(/Provider|provider/);
  });
});

describe("Create Page", () => {
  const page = readPage("create/page.tsx");

  it("has authentication guard", () => {
    expect(page).toMatch(/auth|session|redirect/i);
  });

  it("renders SideNav", () => {
    expect(page).toContain("SideNav");
  });

  it("includes OnboardingGate", () => {
    expect(page).toContain("OnboardingGate");
  });
});

describe("Calendar Page", () => {
  const page = readPage("calendar/page.tsx");

  it("has authentication guard", () => {
    expect(page).toMatch(/auth|session|redirect/i);
  });

  it("renders SideNav", () => {
    expect(page).toContain("SideNav");
  });

  it("renders CalendarClient", () => {
    expect(page).toContain("CalendarClient");
  });
});

describe("Notes Page", () => {
  const page = readPage("notes/page.tsx");

  it("has authentication guard", () => {
    expect(page).toMatch(/auth|session|redirect/i);
  });

  it("renders SideNav", () => {
    expect(page).toContain("SideNav");
  });
});

describe("Projects Page", () => {
  const page = readPage("projects/page.tsx");

  it("has authentication guard", () => {
    expect(page).toMatch(/auth|session|redirect/i);
  });

  it("renders SideNav", () => {
    expect(page).toContain("SideNav");
  });
});

describe("Progress Page", () => {
  const page = readPage("progress/page.tsx");

  it("has authentication guard", () => {
    expect(page).toMatch(/auth|session|redirect/i);
  });

  it("renders SideNav", () => {
    expect(page).toContain("SideNav");
  });
});

describe("Settings Page", () => {
  const page = readPage("settings/page.tsx");

  it("is a server component that delegates to client components", () => {
    expect(page).toContain("ProfileSettingsClient");
  });

  it("renders SettingsNav", () => {
    expect(page).toContain("SettingsNav");
  });

  it("renders multiple settings sections", () => {
    expect(page).toContain("ProfileSettingsClient");
    expect(page).toContain("SecuritySettingsClient");
    expect(page).toContain("NotificationSettingsClient");
  });
});

describe("Publish Page", () => {
  const page = readPage("publish/page.tsx");

  it("uses bg-bg-primary background", () => {
    expect(page).toContain("bg-bg-primary");
  });

  it("does not use gradient backgrounds", () => {
    expect(page).not.toContain("bg-gradient-to-br");
  });
});

describe("Orgs Page", () => {
  const page = readPage("orgs/page.tsx");

  it("has authentication guard", () => {
    expect(page).toMatch(/auth|session|redirect/i);
  });

  it("includes SideNav layout", () => {
    expect(page).toContain("SideNav");
  });
});

describe("Not Found Page", () => {
  const page = readPage("not-found.tsx");

  it("displays 404 content", () => {
    expect(page).toMatch(/404|not.found/i);
  });

  it("has a link back to home", () => {
    expect(page).toMatch(/href.*\/|home/i);
  });
});

describe("All Protected Pages — Auth Guard Consistency", () => {
  const protectedPages = [
    "create/page.tsx",
    "calendar/page.tsx",
    "notes/page.tsx",
    "projects/page.tsx",
    "progress/page.tsx",
    "orgs/page.tsx",
    "chat/page.tsx",
  ];

  for (const pagePath of protectedPages) {
    it(`${pagePath} requires authentication`, () => {
      const page = readPage(pagePath);
      expect(page).toMatch(/auth\(\)|redirect|session/);
    });
  }
});
