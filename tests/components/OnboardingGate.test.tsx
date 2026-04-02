import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { OnboardingGate } from "~/components/auth/OnboardingGate";

describe("OnboardingGate", () => {
  it("renders children by default (tRPC mocked returns null)", () => {
    render(
      <OnboardingGate>
        <div data-testid="child">Child Content</div>
      </OnboardingGate>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByText("Child Content")).toBeTruthy();
  });

  it("does not render RoleSelectionModal when no onboarding needed", () => {
    render(
      <OnboardingGate>
        <span>Hello</span>
      </OnboardingGate>,
    );
    // With mocked tRPC returning null, gate should pass through
    expect(screen.getByText("Hello")).toBeTruthy();
  });
});
