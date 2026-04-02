import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeToggle } from "~/components/providers/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders without crashing", () => {
    const { container } = render(<ThemeToggle />);
    expect(container).toBeTruthy();
  });

  it("renders a toggle button with aria-label", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeTruthy();
    expect(button).toHaveAttribute("aria-label");
  });

  it("is clickable", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    await user.click(button);
    // Should not throw
    expect(button).toBeTruthy();
  });
});
