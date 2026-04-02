import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { CreateNoteForm } from "~/components/notes/CreateNoteForm";

describe("CreateNoteForm", () => {
  it("renders without crashing", () => {
    const { container } = render(<CreateNoteForm />);
    expect(container).toBeTruthy();
  });

  it("shows a button to create a note", () => {
    render(<CreateNoteForm />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});
