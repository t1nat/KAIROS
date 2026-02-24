import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ViewOnlyBanner } from "~/components/orgs/ViewOnlyBanner";

describe("ViewOnlyBanner", () => {
  it("renders the banner when show is true", () => {
    render(<ViewOnlyBanner show={true} />);
    expect(screen.getByText(/view-only mode/i)).toBeInTheDocument();
  });

  it("displays the mentor message text", () => {
    render(<ViewOnlyBanner show={true} />);
    expect(
      screen.getByText(
        /your role does not allow editing in this workspace/i,
      ),
    ).toBeInTheDocument();
  });

  it("renders nothing when show is false", () => {
    const { container } = render(<ViewOnlyBanner show={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("applies warning colour via inline styles", () => {
    render(<ViewOnlyBanner show={true} />);
    const banner = screen.getByText(/view-only mode/i).closest("div");
    expect(banner).not.toBeNull();
    expect(banner!.style.backgroundColor).toContain("var(--warning)");
  });
});
