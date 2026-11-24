import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import Screen from "./Notes";
import { api } from "@/api/client";

vi.mock("@/api/client", () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
}));

const mockGet = api.GET as unknown as ReturnType<typeof vi.fn>;
const mockPost = api.POST as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  // Default: the shared list starts empty unless a test overrides it.
  mockGet.mockResolvedValue({ data: [], error: undefined, response: new Response() });
});

describe("Notes screen", () => {
  it("[AC-005] loads the shared list through the generated client and renders it newest first", async () => {
    const newer = {
      id: crypto.randomUUID(),
      title: "Newest note",
      body: "Written most recently.",
      createdAt: "2026-11-25T14:32:00Z",
    };
    const older = {
      id: crypto.randomUUID(),
      title: "Older note",
      body: "Written earlier.",
      createdAt: "2026-11-20T09:00:00Z",
    };
    // The backend returns notes newest-created-first; the screen renders the order it gets.
    mockGet.mockResolvedValue({ data: [newer, older], error: undefined, response: new Response() });

    render(<Screen />);

    const list = await screen.findByTestId("shared-notes-3-list");
    const titles = Array.from(list.querySelectorAll("label")).map((el) => el.textContent);
    expect(titles).toEqual(["Newest note", "Older note"]);
    expect(mockGet).toHaveBeenCalledWith("/notes");
    expect(screen.queryByTestId("no-notes-yet-write-the-first-one-a-empty")).not.toBeInTheDocument();
  });

  it("[AC-005] shows the empty-state message when the shared store has no notes", async () => {
    mockGet.mockResolvedValue({ data: [], error: undefined, response: new Response() });

    render(<Screen />);

    expect(
      await screen.findByTestId("no-notes-yet-write-the-first-one-a-empty"),
    ).toHaveTextContent("No notes yet. Write the first one above.");
    expect(screen.queryByTestId("shared-notes-3-list")).not.toBeInTheDocument();
  });

  it("[AC-006] a note created by any visitor appears at the top of the list once loaded", async () => {
    const fromAnotherVisitor = {
      id: crypto.randomUUID(),
      title: "Shared by someone else",
      body: "Visible to everyone.",
      createdAt: "2026-11-25T08:00:00Z",
    };
    mockGet.mockResolvedValue({
      data: [fromAnotherVisitor],
      error: undefined,
      response: new Response(),
    });

    render(<Screen />);

    const list = await screen.findByTestId("shared-notes-3-list");
    const firstLabel = list.querySelector("label");
    expect(firstLabel).toHaveTextContent("Shared by someone else");
  });

  it("[AC-005] updates the list without a page reload once a new note is saved", async () => {
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

    await screen.findByTestId("no-notes-yet-write-the-first-one-a-empty");

    fireEvent.change(screen.getByTestId("title-required-max-100-characters-input"), {
      target: { value: "Standup notes" },
    });
    fireEvent.change(screen.getByTestId("body-max-2-000-characters-input"), {
      target: { value: "Nothing new today." },
    });
    fireEvent.click(screen.getByTestId("save-note-btn"));

    const list = await screen.findByTestId("shared-notes-3-list");
    expect(list).toHaveTextContent("Standup notes");
    expect(screen.queryByTestId("no-notes-yet-write-the-first-one-a-empty")).not.toBeInTheDocument();
  });

  it("[AC-002] shows a validation message and does not save when the title is left empty", async () => {
    render(<Screen />);
    await screen.findByTestId("no-notes-yet-write-the-first-one-a-empty");

    fireEvent.click(screen.getByTestId("save-note-btn"));

    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it("[AC-003] limits the title input to 100 characters", async () => {
    render(<Screen />);
    await screen.findByTestId("no-notes-yet-write-the-first-one-a-empty");

    const titleInput = screen.getByTestId("title-required-max-100-characters-input");
    const tooLong = "a".repeat(140);
    fireEvent.change(titleInput, { target: { value: tooLong } });

    expect(titleInput).toHaveValue("a".repeat(100));
  });

  it("[AC-004] limits the body input to 2,000 characters", async () => {
    render(<Screen />);
    await screen.findByTestId("no-notes-yet-write-the-first-one-a-empty");

    const bodyInput = screen.getByTestId("body-max-2-000-characters-input");
    const tooLong = "b".repeat(2200);
    fireEvent.change(bodyInput, { target: { value: tooLong } });

    expect(bodyInput).toHaveValue("b".repeat(2000));
  });

  it("[AC-005] shows an error message when the shared list cannot be loaded", async () => {
    mockGet.mockResolvedValue({ data: undefined, error: { detail: "boom" }, response: new Response() });

    render(<Screen />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load notes. Try again.");
    expect(screen.queryByTestId("no-notes-yet-write-the-first-one-a-empty")).not.toBeInTheDocument();
  });
});
