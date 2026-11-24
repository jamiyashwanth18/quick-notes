import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import Screen from "./Export";
import { api } from "@/api/client";
import { clearSessionToken } from "@/lib/api";

vi.mock("@/api/client", () => ({
  api: { GET: vi.fn(), PUT: vi.fn() },
}));

const mockGet = api.GET as unknown as ReturnType<typeof vi.fn>;
const mockPut = api.PUT as unknown as ReturnType<typeof vi.fn>;

function renderScreen() {
  return render(
    <MemoryRouter>
      <Screen />
    </MemoryRouter>,
  );
}

let lastAnchor: HTMLAnchorElement | null = null;
let lastBlobText = "";
const OriginalBlob = global.Blob;

function buildMarkdown(noteCount: number): string {
  const notes = Array.from(
    { length: noteCount },
    (_, i) => `## Note ${i + 1}\n\n2026-01-0${(i % 9) + 1}T00:00:00Z\n\nBody ${i + 1}`,
  ).join("\n\n");
  return `# Quick Notes\n\n${notes}`;
}

// GET /settings and GET /notes/export share the one mocked `api.GET`: each test sets
// these two response shapes, and the mock dispatches on the path it was called with so
// one test's settings fixture never leaks into another test's export assertions.
let settingsResponse: { data?: { exportLimit: number }; error?: unknown; response?: Response } = {
  data: { exportLimit: 100 },
  error: undefined,
  response: new Response(null, { status: 200 }),
};
let exportResponse: { data?: string; error?: unknown; response?: Response } = {
  data: undefined,
  error: undefined,
  response: new Response(null, { status: 200 }),
};

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  settingsResponse = {
    data: { exportLimit: 100 },
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
  exportResponse = {
    data: undefined,
    error: undefined,
    response: new Response(null, { status: 200 }),
  };
  mockGet.mockImplementation(async (path: string) => {
    if (path === "/settings") return settingsResponse;
    return exportResponse;
  });

  lastAnchor = null;
  lastBlobText = "";
  global.Blob = class RecordingBlob extends OriginalBlob {
    constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
      super(parts, options);
      lastBlobText = (parts ?? []).join("");
    }
  } as unknown as typeof Blob;
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
  global.Blob = OriginalBlob;
});

describe("Export screen — download", () => {
  it("[AC-013] downloads a single Markdown file through the generated client with no email or cloud call involved", async () => {
    exportResponse = {
      data: "# Quick Notes\n\nSome content.",
      error: undefined,
      response: new Response(null, { status: 200 }),
    };

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
    exportResponse = {
      data: "# Quick Notes",
      error: undefined,
      response: new Response(null, { status: 200 }),
    };

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
    exportResponse = {
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 404 }),
    };

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    expect(await screen.findByText("Nothing to export yet")).toBeInTheDocument();
    expect(lastAnchor).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("[AC-013] shows an error message and forces no file when the export call fails unexpectedly", async () => {
    exportResponse = {
      data: undefined,
      error: { detail: "boom" },
      response: new Response(null, { status: 500 }),
    };

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    expect(await screen.findByText("Could not export notes. Try again.")).toBeInTheDocument();
    expect(lastAnchor).toBeNull();
  });

  it("[AC-016] downloads exactly the server-capped 100 most recent notes when more than the limit exist", async () => {
    const markdown = buildMarkdown(100);
    exportResponse = {
      data: markdown,
      error: undefined,
      response: new Response(null, { status: 200 }),
    };

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    await waitFor(() => expect(lastAnchor).not.toBeNull());
    expect(mockGet).toHaveBeenCalledWith("/notes/export", { parseAs: "text" });

    expect(lastBlobText).toBe(markdown);
    expect((lastBlobText.match(/^## /gm) ?? []).length).toBe(100);
    expect(await screen.findByText(`Downloaded ${lastAnchor?.download}.`)).toBeInTheDocument();
  });

  it("[AC-017] downloads all existing notes, unaltered, when there are fewer notes than the export limit", async () => {
    const markdown = buildMarkdown(3);
    exportResponse = {
      data: markdown,
      error: undefined,
      response: new Response(null, { status: 200 }),
    };

    renderScreen();
    fireEvent.click(screen.getByTestId("download-markdown-btn"));

    await waitFor(() => expect(lastAnchor).not.toBeNull());

    expect(lastBlobText).toBe(markdown);
    expect((lastBlobText.match(/^## /gm) ?? []).length).toBe(3);
    expect(await screen.findByText(`Downloaded ${lastAnchor?.download}.`)).toBeInTheDocument();
  });
});

describe("Export screen — export-limit setting", () => {
  it("[AC-018] shows 100 as the export limit before the server has answered", () => {
    // Never resolves within this test, so the field is still showing what it was
    // initialised with: the 100 default, not a blank or a spinner.
    mockGet.mockImplementation(() => new Promise(() => {}));

    renderScreen();

    expect(screen.getByTestId("export-limit-default-100-input")).toHaveValue("100");
  });

  it("[AC-018] shows the export limit's current value once GET /settings answers", async () => {
    settingsResponse = {
      data: { exportLimit: 42 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    };

    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("export-limit-default-100-input")).toHaveValue("42"),
    );
    expect(mockGet).toHaveBeenCalledWith("/settings");
  });

  it("[AC-019] saves a new positive whole number and confirms it", async () => {
    mockPut.mockResolvedValue({
      data: { exportLimit: 25 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });

    renderScreen();

    const input = screen.getByTestId("export-limit-default-100-input");
    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    expect(await screen.findByText("Export limit saved")).toBeInTheDocument();
    expect(mockPut).toHaveBeenCalledWith("/settings", { body: { exportLimit: 25 } });
    expect(input).toHaveValue("25");
  });

  it("[AC-019] keeps only the most recent N notes going forward once the limit changes, by sending the new value to the server", async () => {
    mockPut.mockResolvedValue({
      data: { exportLimit: 5 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });

    renderScreen();
    fireEvent.change(screen.getByTestId("export-limit-default-100-input"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    await waitFor(() =>
      expect(mockPut).toHaveBeenCalledWith("/settings", { body: { exportLimit: 5 } }),
    );
  });

  it("[AC-019] rejects a limit that is not a positive whole number and never calls the server", async () => {
    renderScreen();

    const input = screen.getByTestId("export-limit-default-100-input");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    expect(await screen.findByText("Enter a positive whole number")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "25.5" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));
    expect(screen.getByText("Enter a positive whole number")).toBeInTheDocument();

    expect(mockPut).not.toHaveBeenCalled();
  });

  it("[AC-019] reports a problem, without the validation wording, when a valid number fails to save", async () => {
    mockPut.mockResolvedValue({
      data: undefined,
      error: { detail: "boom" },
      response: new Response(null, { status: 500 }),
    });

    renderScreen();
    fireEvent.change(screen.getByTestId("export-limit-default-100-input"), {
      target: { value: "25" },
    });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    expect(
      await screen.findByText("Could not save the export limit. Try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Enter a positive whole number")).not.toBeInTheDocument();
  });

  it("[AC-020] views and saves the export limit with no sign-in in place", async () => {
    clearSessionToken();
    settingsResponse = {
      data: { exportLimit: 7 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    };
    mockPut.mockResolvedValue({
      data: { exportLimit: 9 },
      error: undefined,
      response: new Response(null, { status: 200 }),
    });

    renderScreen();

    const input = await screen.findByDisplayValue("7");
    fireEvent.change(input, { target: { value: "9" } });
    fireEvent.click(screen.getByTestId("save-limit-btn"));

    expect(await screen.findByText("Export limit saved")).toBeInTheDocument();
  });
});
