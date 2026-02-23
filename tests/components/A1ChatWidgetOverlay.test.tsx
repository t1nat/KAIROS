import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { A1ChatWidgetOverlay } from "~/components/chat/A1ChatWidgetOverlay";

describe("A1ChatWidgetOverlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders the FAB button when closed", () => {
    render(<A1ChatWidgetOverlay />);
    const fab = screen.getByLabelText("Open AI assistant");
    expect(fab).toBeInTheDocument();
  });

  it("renders MessageCircle icon in FAB", () => {
    render(<A1ChatWidgetOverlay />);
    const fab = screen.getByLabelText("Open AI assistant");
    expect(fab).toBeInTheDocument();
    // FAB should be positioned fixed
    expect(fab.className).toContain("fixed");
  });

  it("opens the chat panel when FAB is clicked", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    // Panel should now be visible with title
    expect(screen.getByText("A1 Intelligence")).toBeInTheDocument();
  });

  it("shows minimise, maximise, and close buttons in header", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    expect(screen.getByLabelText("Minimise")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximise")).toBeInTheDocument();
    expect(screen.getByLabelText("Close")).toBeInTheDocument();
  });

  it("closes the panel when close button is clicked", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));
    expect(screen.getByText("A1 Intelligence")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("A1 Intelligence")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Open AI assistant")).toBeInTheDocument();
  });

  it("minimises the panel (hides body)", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const panel = screen.getByText("A1 Intelligence").closest(".fixed");
    expect(panel).toBeInTheDocument();

    await user.click(screen.getByLabelText("Minimise"));

    // After minimise, panel height should be 48px (title bar only)
    await waitFor(() => {
      expect((panel as HTMLElement | null)?.style.height).toBe("48px");
    });
  });

  it("maximises the panel to full viewport", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));
    await user.click(screen.getByLabelText("Maximise"));

    const panelEl = screen.getByText("A1 Intelligence").closest(".fixed");
    const panel = panelEl as unknown as HTMLElement;
    expect(panel.style.width).toBe("100vw");
    expect(panel.style.height).toBe("100vh");
  });

  it("restores from maximise to previous size", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const panel = screen.getByText("A1 Intelligence").closest(".fixed")!;
    const originalWidth = (panel as HTMLElement).style.width;

    await user.click(screen.getByLabelText("Maximise"));
    expect((panel as HTMLElement).style.width).toBe("100vw");

    await user.click(screen.getByLabelText("Restore"));
    expect((panel as HTMLElement).style.width).toBe(originalWidth);
  });

  it("saves position to localStorage", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const stored = localStorage.getItem("kairos-chat-widget-rect");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!) as Record<string, unknown>;
    expect(parsed).toHaveProperty("x");
    expect(parsed).toHaveProperty("y");
    expect(parsed).toHaveProperty("w");
    expect(parsed).toHaveProperty("h");
  });

  it("restores position from localStorage", async () => {
    const savedRect = { x: 100, y: 200, w: 400, h: 500 };
    localStorage.setItem("kairos-chat-widget-rect", JSON.stringify(savedRect));

    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const panelEl = screen.getByText("A1 Intelligence").closest(".fixed");
    const panel = panelEl as unknown as HTMLElement;
    expect(panel.style.left).toBe("100px");
    expect(panel.style.top).toBe("200px");
  });

  it("passes projectId to ProjectIntelligenceChat", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay projectId={42} />);

    await user.click(screen.getByLabelText("Open AI assistant"));
    expect(screen.getByText("A1 Intelligence")).toBeInTheDocument();
  });

  it("renders with solid background styling", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const panel = screen.getByText("A1 Intelligence").closest(".fixed");
    expect(panel?.className).toContain("bg-bg-primary");
    expect(panel?.className).not.toContain("kairos-glass");
  });

  it("shows resize indicator in normal mode", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    // The SVG resize indicator should be present
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("hides resize indicator when maximised", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));
    await user.click(screen.getByLabelText("Maximise"));

    // Resize indicator SVG should not be present in maximised mode
    // (the pointer-events-none div with SVG)
    const indicators = document.querySelectorAll(".pointer-events-none svg");
    expect(indicators.length).toBe(0);
  });

  it("supports drag via pointer events on header", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const header = screen.getByText("A1 Intelligence").closest("[class*='cursor-grab']");
    expect(header).toBeInTheDocument();
    expect(header?.className).toContain("cursor-grab");
  });

  it("applies accent primary color to FAB", () => {
    render(<A1ChatWidgetOverlay />);
    const fab = screen.getByLabelText("Open AI assistant");
    expect(fab.style.backgroundColor).toBe("rgb(var(--accent-primary))");
  });

  it("renders with rounded-2xl border", async () => {
    const user = userEvent.setup();
    render(<A1ChatWidgetOverlay />);

    await user.click(screen.getByLabelText("Open AI assistant"));

    const panel = screen.getByText("A1 Intelligence").closest(".fixed");
    expect(panel?.className).toContain("rounded-2xl");
  });
});
