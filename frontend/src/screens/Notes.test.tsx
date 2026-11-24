import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import Screen from "./Notes";
import { api } from "@/api/client";

vi.mock("@/api/client", () => ({
  api: { POST: vi.fn() },
}));

// The generated schema (src/api/schema.ts) is regenerated from the backend's own
// OpenAPI document and does not yet list "/notes" in this workspace snapshot, so
// the mock is driven through an untyped handle rather than through api.POST's own
// (stale) call signature.
const mockPost = api.POST as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPost.mockReset();
});

describe("Notes screen", () => {
  it("[AC-002] shows a validation message and does not save when the title is left empty", async () => {
    render(<Screen />);

    fireEvent.click(screen.getByTestId("save-note-btn"));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
    expect(screen.queryByTestId("shared-notes-3-list")).not.toBeInTheDocument();
  });

  it("[AC-003] limits the title input to 100 characters", () => {
    render(<Screen />);

    const titleInput = screen.getByTestId("title-required-max-100-characters-input");
    const tooLong = "a".repeat(140);
    fireEvent.change(titleInput, { target: { value: tooLong } });

    expect(titleInput).toHaveValue("a".repeat(100));
  });

  it("[AC-004] limits the body input to 2,000 characters", () => {
    render(<Screen />);

    const bodyInput = screen.getByTestId("body-max-2-000-characters-input");
    const tooLong = "b".repeat(2200);
    fireEvent.change(bodyInput, { target: { value: tooLong } });

    expect(bodyInput).toHaveValue("b".repeat(2000));
  });

  it("[AC-001] saves the note through the generated client and appends it to the shared list", async () => {
    const id = crypto.randomUUID();
    mockPost.mockResolvedValue({
      data: {
        id,
        title: "Standup notes",
        body: "Nothing new today.",
        createdAt: "2026-11-25T14:32:00Z",
      },
      error: undefined,
      response: new Response(),
    });

    render(<Screen />);

    fireEvent.change(screen.getByTestId("title-required-max-100-characters-input"), {
      target: { value: "Standup notes" },
    });
    fireEvent.change(screen.getByTestId("body-max-2-000-characters-input"), {
      target: { value: "Nothing new today." },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith("/notes", {
      body: { title: "Standup notes", body: "Nothing new today." },
    }));

    const list = await screen.findByTestId("shared-notes-3-list");
    expect(list).toHaveTextContent("Standup notes");
    expect(screen.queryByTestId("no-notes-yet-write-the-first-one-a-empty")).not.toBeInTheDocument();
  });

  it("[AC-001] shows the empty-state message before any note has been saved", () => {
    render(<Screen />);

    expect(
      screen.getByTestId("no-notes-yet-write-the-first-one-a-empty"),
    ).toHaveTextContent("No notes yet. Write the first one above.");
  });
});
