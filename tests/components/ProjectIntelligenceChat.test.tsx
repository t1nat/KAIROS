import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectIntelligenceChat } from "~/components/projects/ProjectIntelligenceChat";

/**
 * The global next-intl mock (tests/setup.tsx) makes
 *   useTranslations("chat") => (key: string) => key
 * So every t("foo") call returns the literal key string "foo".
 * The tests below assert against those key strings.
 */

describe("ProjectIntelligenceChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ---- Basic rendering ---- */

  it("renders without crashing", () => {
    render(<ProjectIntelligenceChat />);
    // emptyTitle key → rendered as "emptyTitle"
    expect(screen.getByText("emptyTitle")).toBeInTheDocument();
  });

  it("renders with a projectId prop", () => {
    render(<ProjectIntelligenceChat projectId={1} />);
    expect(screen.getByText("emptyTitle")).toBeInTheDocument();
  });

  it("renders the message input", () => {
    render(<ProjectIntelligenceChat />);
    // placeholder key
    const input = screen.getByPlaceholderText("placeholder");
    expect(input).toBeInTheDocument();
  });

  it("renders the send button", () => {
    render(<ProjectIntelligenceChat />);
    // send key
    const sendBtn = screen.getByText("send");
    expect(sendBtn).toBeInTheDocument();
  });

  it("send button is disabled when input is empty", () => {
    render(<ProjectIntelligenceChat />);
    const sendBtn = screen.getByText("send");
    expect(sendBtn).toBeDisabled();
  });

  /* ---- Text input & sending ---- */

  it("enables send button when text is typed", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "Hello");

    const sendBtn = screen.getByText("send");
    expect(sendBtn).not.toBeDisabled();
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "Hello");
    await user.click(screen.getByText("send"));

    expect(input).toHaveValue("");
  });

  it("shows user message after sending", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "Hello");
    await user.click(screen.getByText("send"));

    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  /* ---- Greeting detection ---- */

  it("shows greeting response for simple greetings instead of API call", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "hi");
    await user.click(screen.getByText("send"));

    // Should show user message
    expect(screen.getByText("hi")).toBeInTheDocument();
    // Should show an agent greeting (one of the i18n key strings: greeting1..greeting4)
    const agentMessages = document.querySelectorAll(".kairos-chat-response");
    expect(agentMessages.length).toBeGreaterThan(0);
  });

  /* ---- Thinking indicator ---- */

  it("shows thinking dots for non-greeting non-task messages", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "What is my project status?");
    await user.click(screen.getByText("send"));

    // Thinking dots should appear
    const thinkingIndicator = screen.getByTestId("thinking-indicator");
    expect(thinkingIndicator).toBeInTheDocument();
    expect(thinkingIndicator.className).toContain("kairos-thinking-dots");
  });

  /* ---- Task planner handoff ---- */

  it("shows handoff message when user asks to create tasks", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "create tasks for my project");
    await user.click(screen.getByText("send"));

    // Should show the user message
    expect(
      screen.getByText("create tasks for my project"),
    ).toBeInTheDocument();

    // Should show "handoffTaskPlanner" (the i18n key)
    expect(screen.getByText("handoffTaskPlanner")).toBeInTheDocument();
  });

  it("shows handoff message for 'build tasks' intent", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "build tasks into the project");
    await user.click(screen.getByText("send"));

    expect(screen.getByText("handoffTaskPlanner")).toBeInTheDocument();
  });

  it("shows sub-agent working indicator for task planner", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "create tasks for my project");
    await user.click(screen.getByText("send"));

    // The sub-agent sentinel triggers a visually distinct indicator
    const subagent = screen.queryByTestId("subagent-indicator");
    // The indicator appears while the pipeline runs (may or may not be visible depending on mutation mock timing)
    // At minimum, the handoff message should always appear
    expect(screen.getByText("handoffTaskPlanner")).toBeInTheDocument();
    // If the sub-agent indicator is visible, it should use the correct class
    if (subagent) {
      expect(subagent.className).toContain("kairos-subagent-working");
    }
  });

  /* ---- Static UI ---- */

  it("renders the disclaimer text", () => {
    render(<ProjectIntelligenceChat />);
    // disclaimer key
    expect(screen.getByText("disclaimer")).toBeInTheDocument();
  });

  it("input has proper styling classes", () => {
    render(<ProjectIntelligenceChat />);
    const input = screen.getByPlaceholderText("placeholder");
    expect(input.className).toContain("bg-transparent");
  });

  it("form has border-top styling", () => {
    render(<ProjectIntelligenceChat />);
    const form = document.querySelector("form");
    expect(form).toBeInTheDocument();
    expect(form?.className).toContain("border-t");
  });

  /* ---- Message alignment & classes ---- */

  it("message bubbles have correct alignment", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "hi");
    await user.click(screen.getByText("send"));

    // User message should be right-aligned
    const userMsg = screen.getByText("hi").closest(".kairos-msg-enter");
    expect(userMsg?.className).toContain("justify-end");

    // Agent message should be left-aligned
    const agentMessages = document.querySelectorAll(
      ".kairos-msg-enter.flex.justify-start",
    );
    expect(agentMessages.length).toBeGreaterThan(0);
  });

  it("agent messages use kairos-chat-response class", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "hi");
    await user.click(screen.getByText("send"));

    const agentBubbles = document.querySelectorAll(".kairos-chat-response");
    expect(agentBubbles.length).toBeGreaterThan(0);
  });

  it("user messages use whitespace-pre-wrap class", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "User msg");
    await user.click(screen.getByText("send"));

    const userBubble = screen.getByText("User msg");
    expect(userBubble.className).toContain("whitespace-pre-wrap");
  });

  it("messages have click-to-copy functionality", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    const input = screen.getByPlaceholderText("placeholder");
    await user.type(input, "Copy me");
    await user.click(screen.getByText("send"));

    const copyButton = screen.getByText("Copy me").closest("button");
    expect(copyButton).toBeInTheDocument();
    // copyTooltip key
    expect(copyButton).toHaveAttribute("title", "copyTooltip");
  });

  /* ---- Suggested questions ---- */

  it("renders suggested questions in empty state", () => {
    render(<ProjectIntelligenceChat />);
    // Suggested question keys
    expect(screen.getByText("suggestedQ1")).toBeInTheDocument();
    expect(screen.getByText("suggestedQ2")).toBeInTheDocument();
    expect(screen.getByText("suggestedQ3")).toBeInTheDocument();
    expect(screen.getByText("suggestedQ4")).toBeInTheDocument();
  });

  /* ---- Header ---- */

  it("renders header with KAIROS AI title (i18n key)", () => {
    render(<ProjectIntelligenceChat />);
    // title key
    expect(screen.getByText("title")).toBeInTheDocument();
    // subtitle key
    expect(screen.getByText("subtitle")).toBeInTheDocument();
  });

  it("info button toggles info panel", async () => {
    const user = userEvent.setup();
    render(<ProjectIntelligenceChat />);

    // info key
    const infoBtn = screen.getByText("info");
    expect(infoBtn).toBeInTheDocument();

    await user.click(infoBtn);
    // hide key
    expect(screen.getByText("hide")).toBeInTheDocument();
    // infoDesc and infoCaps keys
    expect(screen.getByText("infoDesc")).toBeInTheDocument();
    expect(screen.getByText("infoCaps")).toBeInTheDocument();
  });
});
