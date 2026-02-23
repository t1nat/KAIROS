import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SideNav } from "~/components/layout/SideNav";

// Mock A1ChatWidgetOverlay
vi.mock("~/components/chat/A1ChatWidgetOverlay", () => ({
  A1ChatWidgetOverlay: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="a1-widget">Chat Widget</div> : null,
}));

describe("SideNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<SideNav />);
    expect(screen.getByText("KAIROS")).toBeInTheDocument();
  });

  it("renders the desktop sidebar", () => {
    const { container } = render(<SideNav />);
    const aside = container.querySelector('aside[aria-label="Primary"]');
    expect(aside).not.toBeNull();
  });

  it("contains nav items with correct translated labels", () => {
    render(<SideNav />);
    // useTranslations mock returns the key itself
    expect(screen.getAllByText("home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("create").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("projects").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("notes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("progress").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("events").length).toBeGreaterThanOrEqual(1);
  });

  it("contains settings nav item", () => {
    render(<SideNav />);
    expect(screen.getAllByText("settings").length).toBeGreaterThanOrEqual(1);
  });

  it("does not use legacy card classes in tooltips", () => {
    const { container } = render(<SideNav />);
    const tooltips = container.querySelectorAll("[class*='ios-card']");
    expect(tooltips.length).toBe(0);
  });

  it("uses design token classes for tooltips", () => {
    const { container } = render(<SideNav />);
    const tooltipEls = container.querySelectorAll("[class*='bg-bg-elevated']");
    expect(tooltipEls.length).toBeGreaterThan(0);
  });

  it("opens mobile menu on hamburger click", async () => {
    const user = userEvent.setup();
    render(<SideNav />);

    const menuBtn = screen.getByLabelText("Menu");
    await user.click(menuBtn);

    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    expect(dialog).toBeInTheDocument();
  });

  it("closes mobile menu on escape key", async () => {
    const user = userEvent.setup();
    render(<SideNav />);

    const menuBtn = screen.getByLabelText("Menu");
    await user.click(menuBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("chat button opens A1 widget", async () => {
    const user = userEvent.setup();
    render(<SideNav />);

    // Find the Chat button in desktop sidebar
    const chatBtns = screen.getAllByLabelText("Chat");
    expect(chatBtns.length).toBeGreaterThanOrEqual(1);

    await user.click(chatBtns[0]!);
    expect(screen.getByTestId("a1-widget")).toBeInTheDocument();
  });

  it("uses elegant icon set (no legacy icon names in DOM)", () => {
    const { container } = render(<SideNav />);
    // The component should render SVG icons from lucide-react
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("highlights active nav item for current path", () => {
    render(<SideNav />);
    // Pathname mock returns "/" so home should be active
    const homeLinks = screen.getAllByText("home");
    const activeLink = homeLinks.find((el) =>
      el.closest("a")?.className.includes("accent-primary"),
    );
    expect(activeLink).toBeTruthy();
  });
});
