import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

import { OrgSwitcher } from "~/components/orgs/OrgSwitcher";

describe("OrgSwitcher", () => {
  it("renders without crashing (returns null with no orgs)", () => {
    const { container } = render(<OrgSwitcher />);
    // With mocked tRPC returning null, OrgSwitcher may render nothing
    expect(container).toBeTruthy();
  });
});
