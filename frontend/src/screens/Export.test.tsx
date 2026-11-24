import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import Screen from "./Export";
import { api } from "@/api/client";

vi.mock("@/api/client", () => ({
  api: { GET: vi.fn() },
}));

const mockGet = api.GET as unknown as ReturnType<typeof vi.fn>;

function renderScreen() {
  return render(
    <MemoryRouter>
      <Screen />
    </MemoryRouter>,
  );
}

let lastAnchor: HTMLAnchorElement | null = null;

beforeEach(() => {
  mockGet.mockReset();
  lastAnchor = null;
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const realAppendChild = document.body.appendChild.bind(document.body);
  vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
    if (node instanceof HTMLAnchorElement) lastAnchor = node;
    return realAppendChild(node);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Export screen", () => {
  it("[AC-013] downloads a single Markdown file through the generated client with no email or cloud call involved", async () => {
    mockGet.mockResolvedValue({
      data: "# Quick Notes\n\nSome content.",
      error: undefined,
      response: new Response(null, { status: 200 }),
    });

    renderScreen();

    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    await waitFor(() => {
      expect(lastAnchor).not.toBeNull();
    });
    expect(mockGet).toHaveBeenCalledWith("/notes/export", { parseAs: "text" });
    expect(lastAnchor?.href).toContain("blob:mock-url");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("[AC-014] names the downloaded file from today's date", async () => {
    mockGet.mockResolvedValue({
      data: "# Quick Notes",
      error: undefined,
      response: new Response(null, { status: 200 }),
    });

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    await waitFor(() => expect(lastAnchor).not.toBeNull());

    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate(),
    ).padStart(2, "0")}-notes.md`;
    expect(lastAnchor?.download).toBe(expected);
    expect(await screen.findByText(`Downloaded ${expected}.`)).toBeInTheDocument();
  });

  it("[AC-015] tells the visitor there is nothing to export and forces no file when there are no notes", async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 404 }),
    });

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    expect(await screen.findByText("Nothing to export yet")).toBeInTheDocument();
    expect(lastAnchor).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("[AC-013] shows an error message and forces no file when the export call fails unexpectedly", async () => {
    mockGet.mockResolvedValue({
      data: undefined,
      error: { detail: "boom" },
      response: new Response(null, { status: 500 }),
    });

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    expect(await screen.findByText("Could not export notes. Try again.")).toBeInTheDocument();
    expect(lastAnchor).toBeNull();
  });

  it("[AC-013] saves a valid export limit and confirms it", () => {
    renderScreen();

    const input = screen.getByTestId("export-limit-default-100-input");
    expect(input).toHaveValue("100");

    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    expect(screen.getByText("Export limit saved")).toBeInTheDocument();
  });

  it("[AC-013] rejects a limit that is not a positive whole number", () => {
    renderScreen();

    const input = screen.getByTestId("export-limit-default-100-input");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    expect(screen.getByText("Enter a positive whole number")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "25.5" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));
    expect(screen.getByText("Enter a positive whole number")).toBeInTheDocument();
  });
});
