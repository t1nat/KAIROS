import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { NotificationSystem } from "~/components/notifications/NotificationSystem";

describe("NotificationSystem", () => {
  it("renders without crashing", () => {
    const { container } = render(<NotificationSystem />);
    expect(container).toBeTruthy();
  });

  it("renders bell icon button", () => {
    render(<NotificationSystem />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("does not show notification count when no data", () => {
    const { container } = render(<NotificationSystem />);
    // With null data from mocked tRPC, no unread badge should appear
    const badge = container.querySelector('[data-testid="unread-count"]');
    expect(badge).toBeNull();
  });
});
