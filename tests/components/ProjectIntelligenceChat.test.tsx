import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectIntelligenceChat } from "~/components/projects/ProjectIntelligenceChat";

describe("ProjectIntelligenceChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<ProjectIntelligenceChat />);
    // Should show the empty state
    expect(
      screen.getByText("Ask a question about your workspace or projects."),
    ).toBeInTheDocument();
  });

  it("renders with a projectId prop", () => {
    render(<ProjectIntelligenceChat projectId={1} />);
    expect(
      screen.getByText("Ask a question about your workspace or projects."),
    ).toBeInTheDocument();
  });

  it("renders the message input", () => {
    render(<ProjectIntelligenceChat />);
    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    expect(input).toBeInTheDocument();
  });

  it("renders the send button", () => {
    render(<ProjectIntelligenceChat />);
    const sendBtn = screen.getByText("Send");
    expect(sendBtn).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<ProjectIntelligenceChat />);
    const sendBtn = screen.getByText("Send");
    expect(sendBtn).toBeDisabled();
  });

  it("enables send button when text is typed", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Hello");

    const sendBtn = screen.getByText("Send");
    expect(sendBtn).not.toBeDisabled();
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Hello");
    await user.click(screen.getByText("Send"));

    expect(input).toHaveValue("");
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Hello");
    await user.click(screen.getByText("Send"));

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("shows thinking indicator after sending", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Hello");
    await user.click(screen.getByText("Send"));

    expect(screen.getByText("Thinking…")).toBeInTheDocument();
  });

  it("renders the disclaimer text", () => {
    render(<ProjectIntelligenceChat />);
    expect(
      screen.getByText(/verify critical decisions/i),
    ).toBeInTheDocument();
  });

  it("input has proper styling classes", () => {
    render(<ProjectIntelligenceChat />);
    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    expect(input.className).toContain("bg-transparent");
  });

  it("form has border-top styling", () => {
    render(<ProjectIntelligenceChat />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    expect(form?.className).toContain("border-t");
  });

  it("message bubbles have correct alignment", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Test message");
    await user.click(screen.getByText("Send"));

    // User message should be right-aligned
    const userMsg = screen.getByText("Test message").closest(".flex");
    expect(userMsg?.className).toContain("justify-end");

    // Agent message should be left-aligned  
    const agentMsg = screen.getByText("Thinking…").closest(".flex");
    expect(agentMsg?.className).toContain("justify-start");
  });

  it("agent messages use kairos-chat-response class", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Test");
    await user.click(screen.getByText("Send"));

    const agentBubble = screen.getByText("Thinking…");
    expect(agentBubble.className).toContain("kairos-chat-response");
  });

  it("user messages use whitespace-pre-wrap class", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "User msg");
    await user.click(screen.getByText("Send"));

    const userBubble = screen.getByText("User msg");
    expect(userBubble.className).toContain("whitespace-pre-wrap");
  });

  it("messages have click-to-copy functionality", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("Message KAIROS AI…");
    await user.type(input, "Copy me");
    await user.click(screen.getByText("Send"));

    const copyButton = screen.getByText("Copy me").closest("button");
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toHaveAttribute("title", "Click to copy");
  });
});
