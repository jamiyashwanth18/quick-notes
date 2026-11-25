import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// US-006: the export is capped by an export-limit setting (default 100), so a visitor
// downloading the export only ever gets the most recent notes up to that limit, every
// note when the store holds fewer than the limit, and a friendly message instead of an
// empty file when there are no notes to export at all. There is no sign-in for this app
// (see frontend/src/api/openapi.json's description), so every test here goes straight to
// "/export".
//
// The suite's database is shared with other tests and other sprints. TC-019 gives its
// 105 notes titles unique to this run (a timestamp suffix) and only relies on their
// relative recency: whatever else is already in the shared store, the 100 most recently
// created notes an at-the-limit export keeps are always this test's own last 100, so no
// exact starting count is needed. TC-021 and TC-022 each need an exact starting count
// (exactly 4 notes, and zero notes) that only the sandbox's clean database can
// guarantee, so both are tagged @sandbox-only and reach the sandbox's own backend
// directly to drain whatever notes earlier tests left behind, the same approach as
// TC-007 in us002-notes.spec.ts.

const backendUrl = "http://127.0.0.1:8000";

async function drainNotes(request: APIRequestContext): Promise<void> {
  const existing: Array<{ id: string }> = await (await request.get(`${backendUrl}/notes`)).json();
  for (const note of existing) {
    await request.delete(`${backendUrl}/notes/${note.id}`);
  }
}

async function createNoteViaApi(request: APIRequestContext, title: string): Promise<void> {
  const response = await request.post(`${backendUrl}/notes`, {
    data: { title, body: "" },
  });
  expect(response.status()).toBe(201);
}

// Precondition shared by every case here: the export limit is at its default of 100.
// Set it explicitly through the Export screen's own settings form, rather than assume
// no earlier test left it at some other value.
async function setExportLimitToDefault(page: Page): Promise<void> {
  await page.goto("/export");
  await expect(page.getByTestId("export-title")).toBeVisible();
  await page.getByTestId("export-limit-default-100-input").fill("100");
  await page.getByTestId("save-limit-btn").click();
  await expect(page.getByText("Export limit saved", { exact: true })).toBeVisible();
}

test("TC-019 Visitor downloads an export capped at 100 notes", async ({ page, request }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();

  // Precondition: the export limit is at its default of 100.
  await setExportLimitToDefault(page);

  // Precondition: 105 notes exist in the shared store, created in order from Note-001
  // (oldest) to Note-105 (most recent). Each title carries this run's stamp so this
  // test's own notes can always be told apart from anything already in the shared store.
  const titles: string[] = [];
  for (let index = 1; index <= 105; index += 1) {
    const title = `Note-${String(index).padStart(3, "0")}-${stamp}`;
    titles.push(title);
    await createNoteViaApi(request, title);
  }

  // Step: open the app and go to the Export screen.
  await page.goto("/export");
  await expect(page.getByTestId("export-title")).toBeVisible();

  const card = page.getByTestId("one-markdown-file-named-from-today-card");
  await expect(card).toBeVisible();

  // Step: click download-markdown-btn.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-markdown-btn").click(),
  ]);

  // Expected: a Markdown file named 2026-11-25-notes.md downloads, matching
  // one-markdown-file-named-from-today-card.
  expect(download.suggestedFilename()).toBe("2026-11-25-notes.md");

  // Step: open the downloaded file.
  const path = await download.path();
  if (!path) {
    throw new Error("The download produced no local file to inspect.");
  }
  const content = readFileSync(path, "utf-8");

  // Expected: it contains 100 notes - the most recent ones (Note-006 through Note-105)
  // - and does not contain the 5 oldest notes (Note-001 through Note-005).
  const oldest = titles.slice(0, 5);
  const mostRecent = titles.slice(5);
  for (const title of oldest) {
    expect(content).not.toContain(title);
  }
  for (const title of mostRecent) {
    expect(content).toContain(title);
  }

  const ownNotesInContent = content.match(new RegExp(`Note-\\d{3}-${stamp}`, "g")) ?? [];
  expect(ownNotesInContent).toHaveLength(100);
});

test("TC-021 Visitor downloads an export containing all notes when under the limit @sandbox-only", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const stamp = Date.now();

  // Precondition: the export limit is at its default of 100, and the shared store
  // contains no notes at all yet, so that exactly this test's 4 notes exist once added.
  // Only the sandbox's clean database guarantees this, hence @sandbox-only.
  await setExportLimitToDefault(page);
  await drainNotes(request);

  // Precondition: 4 notes exist in the shared store: Note-A, Note-B, Note-C, Note-D.
  const titles = ["A", "B", "C", "D"].map((letter) => `Note-${letter}-${stamp}`);
  for (const title of titles) {
    await createNoteViaApi(request, title);
  }

  // Step: open the app and go to the Export screen.
  await page.goto("/export");
  await expect(page.getByTestId("export-title")).toBeVisible();

  const card = page.getByTestId("one-markdown-file-named-from-today-card");
  await expect(card).toBeVisible();

  // Step: click download-markdown-btn.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-markdown-btn").click(),
  ]);

  // Expected: a Markdown file named 2026-11-25-notes.md downloads, matching
  // one-markdown-file-named-from-today-card.
  expect(download.suggestedFilename()).toBe("2026-11-25-notes.md");

  // Step: open the downloaded file.
  const path = await download.path();
  if (!path) {
    throw new Error("The download produced no local file to inspect.");
  }
  const content = readFileSync(path, "utf-8");

  // Expected: it contains all 4 notes (Note-A, Note-B, Note-C, Note-D) with none missing.
  for (const title of titles) {
    expect(content).toContain(title);
  }
});

test("TC-022 Visitor sees nothing-to-export message when no notes exist @sandbox-only", async ({
  page,
  request,
}) => {
  // Precondition: the export limit is at its default of 100, and no notes exist in the
  // shared store. Only the sandbox's clean database guarantees this, hence
  // @sandbox-only.
  await setExportLimitToDefault(page);
  await drainNotes(request);

  let downloadFired = false;
  page.on("download", () => {
    downloadFired = true;
  });

  // Step: open the app and go to the Export screen.
  await page.goto("/export");

  // Expected: the Export screen shows with export-title, and the message 'Nothing to
  // export yet' shows, and no file is downloaded.
  await expect(page.getByTestId("export-title")).toBeVisible();
  await expect(page.getByText("Nothing to export yet", { exact: true })).toBeVisible();
  expect(downloadFired).toBe(false);
});
