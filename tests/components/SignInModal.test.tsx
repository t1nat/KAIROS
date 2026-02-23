import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignInModal } from "~/components/auth/SignInModal";

describe("SignInModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    const { container } = render(<SignInModal isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders when isOpen is true", () => {
    render(<SignInModal {...defaultProps} />);
    expect(screen.getByPlaceholderText("your@email.com")).toBeInTheDocument();
  });

  it("renders email input", () => {
    render(<SignInModal {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText("your@email.com");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("renders password input", () => {
    render(<SignInModal {...defaultProps} />);
    const passInput = screen.getByPlaceholderText("••••••••");
    expect(passInput).toBeInTheDocument();
    expect(passInput).toHaveAttribute("type", "password");
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    render(<SignInModal isOpen={true} onClose={onClose} />);
    // The backdrop is the element with bg-black/60 class
    const backdrop = document.querySelector(".backdrop-blur-xl");
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("allows typing in email field", async () => {
    const user = userEvent.setup();
    render(<SignInModal {...defaultProps} />);

    const emailInput = screen.getByPlaceholderText("your@email.com");
    await user.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");
  });

  it("allows typing in password field", async () => {
    const user = userEvent.setup();
    render(<SignInModal {...defaultProps} />);

    const passInput = screen.getByPlaceholderText("••••••••");
    await user.type(passInput, "secret123");
    expect(passInput).toHaveValue("secret123");
  });

  it("has a toggle between sign in and sign up", () => {
    render(<SignInModal {...defaultProps} />);
    const toggleBtn = screen.getByText(/Don't have an account\? Sign up/i);
    expect(toggleBtn).toBeInTheDocument();
  });

  it("shows name field in sign up mode", async () => {
    const user = userEvent.setup();
    render(<SignInModal {...defaultProps} />);

    const toggleBtn = screen.getByText(/Don't have an account\? Sign up/i);
    await user.click(toggleBtn);

    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
  });

  it("shows sign up heading in sign up mode", async () => {
    const user = userEvent.setup();
    render(<SignInModal {...defaultProps} />);

    await user.click(screen.getByText(/Don't have an account\? Sign up/i));

    expect(screen.getByText("Create your Kairos workspace")).toBeInTheDocument();
  });

  it("pre-fills email when initialEmail is provided", () => {
    render(<SignInModal isOpen={true} onClose={vi.fn()} initialEmail="pre@fill.com" />);
    const emailInput = screen.getByPlaceholderText("your@email.com");
    expect(emailInput).toHaveValue("pre@fill.com");
  });

  it("applies glassmorphism backdrop styling", () => {
    render(<SignInModal {...defaultProps} />);
    const backdrop = document.querySelector(".backdrop-blur-xl");
    expect(backdrop).toBeInTheDocument();
  });

  it("renders Google sign-in button", () => {
    render(<SignInModal {...defaultProps} />);
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });

  it("renders with kairos design system classes", () => {
    render(<SignInModal {...defaultProps} />);
    const modal = document.querySelector(".kairos-modal-content");
    expect(modal).toBeInTheDocument();
  });

  it("has submit button for sign in", () => {
    render(<SignInModal {...defaultProps} />);
    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it("shows Welcome back heading in sign in mode", () => {
    render(<SignInModal {...defaultProps} />);
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });

  it("shows toggle back to sign in from sign up", async () => {
    const user = userEvent.setup();
    render(<SignInModal {...defaultProps} />);

    await user.click(screen.getByText(/Don't have an account\? Sign up/i));
    expect(screen.getByText(/Already have an account\? Sign in/i)).toBeInTheDocument();
  });

  it("renders terms and privacy notice", () => {
    render(<SignInModal {...defaultProps} />);
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument();
  });
});
