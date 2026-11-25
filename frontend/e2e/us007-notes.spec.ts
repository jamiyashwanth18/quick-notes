import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

// US-007: a visitor can view and change the export-limit setting that caps how many
// notes an export keeps (default 100), with a validation message for a non-positive
// value, and none of this requires signing in -- there is no sign-in anywhere in this
// app (see frontend/src/api/openapi.json's description). Every test here goes straight
// to "/export".
//
// The suite's database and its settings row are shared with other tests, other story
// files and other sprints, so a test never assumes the export limit still holds
// whatever an earlier test last left it at. TC-031 and TC-037 each reset the limit to a
// known value through the backend's own /settings endpoint before checking it, rather
// than assume no earlier test (here or in another file) left it somewhere else; this is
// setup, not the thing under test, so it bypasses the UI the same way other specs reach
// the backend directly to drain notes before an empty-state check (see TC-007 in
// us002-notes.spec.ts). TC-036 and TC-040 give the notes they create titles unique to
// the run (a timestamp suffix) so they can always be told apart from anything already
// in the shared store.

const backendUrl = "http://127.0.0.1:8000";

async function getExportLimit(request: APIRequestContext): Promise<number> {
  const response = await request.get(`${backendUrl}/settings`);
  expect(response.status()).toBe(200);
  const body: { exportLimit: number } = await response.json();
  return body.exportLimit;
}

async function setExportLimit(request: APIRequestContext, exportLimit: number): Promise<void> {
  const response = await request.put(`${backendUrl}/settings`, {
    data: { exportLimit },
  });
  expect(response.status()).toBe(200);
}

async function createNote(page: Page, title: string, body: string): Promise<void> {
  await page.goto("/");
  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  await titleInput.fill(title);
  await bodyInput.fill(body);
  await page.getByTestId("save-note-btn").click();

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(title);

  const firstNote = list.locator(":scope > *").first();
  await expect(firstNote).toContainText(title);
}

test("TC-031 Visitor sees the default export limit", async ({ page, request }) => {
  // Precondition: the export limit has never been changed from its default. Reset it to
  // 100 through the backend directly -- setup, not the thing under test -- rather than
  // assume no earlier test left it at some other value.
  await setExportLimit(request, 100);

  // Step: open the Export screen.
  await page.goto("/export");

  // Expected: the export-title heading and export-settings-form are shown.
  await expect(page.getByTestId("export-title")).toBeVisible();
  await expect(page.getByTestId("export-settings-form")).toBeVisible();

  // Step: look at export-limit-default-100-input.
  // Expected: the input shows the value 100.
  await expect(page.getByTestId("export-limit-default-100-input")).toHaveValue("100");
});

test("TC-036 Visitor updates export limit and export reflects it", async ({ page, request }) => {
  test.setTimeout(60_000);
  const stamp = Date.now();
  const first = `First ${stamp}`;
  const second = `Second ${stamp}`;
  const third = `Third ${stamp}`;

  // Precondition: the visitor is on the Export screen.
  // Step: open the Export screen.
  await page.goto("/export");
  await expect(page.getByTestId("export-settings-form")).toBeVisible();

  // Step: enter 2 in export-limit-default-100-input.
  const limitInput = page.getByTestId("export-limit-default-100-input");
  await limitInput.fill("2");
  // Expected: the input shows 2.
  await expect(limitInput).toHaveValue("2");

  // Step: click save-limit-btn.
  await page.getByTestId("save-limit-btn").click();
  // Expected: the message 'Export limit saved' shows.
  await expect(page.getByText("Export limit saved", { exact: true })).toBeVisible();

  // Step: click back-to-notes-link to go to the notes list.
  await page.getByTestId("back-to-notes-link").click();
  // Expected: the notes list screen is shown. The shared list may be empty right now
  // (an earlier, unrelated test may have drained it), so check the Notes screen itself
  // rather than assume the list element is already present.
  await expect(page.getByTestId("notes-title")).toBeVisible();

  // Step: create note First.
  await createNote(page, first, "First note body");
  const list = page.getByTestId("shared-notes-3-list");

  // Step: create note Second.
  // Expected: Second appears at the top of the shared list, above First.
  await createNote(page, second, "Second note body");
  {
    const text = await list.innerText();
    expect(text.indexOf(second)).toBeLessThan(text.indexOf(first));
  }

  // Step: create note Third.
  // Expected: Third appears at the top of the shared list, above Second and First.
  await createNote(page, third, "Third note body");
  {
    const text = await list.innerText();
    expect(text.indexOf(third)).toBeLessThan(text.indexOf(second));
    expect(text.indexOf(second)).toBeLessThan(text.indexOf(first));
  }

  // Step: return to the Export screen and click download-markdown-btn.
  await page.goto("/export");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-markdown-btn").click(),
  ]);

  // Expected: a Markdown file named 2026-11-25-notes.md downloads.
  expect(download.suggestedFilename()).toBe("2026-11-25-notes.md");

  const path = await download.path();
  if (!path) {
    throw new Error("The download produced no local file to inspect.");
  }
  const content = readFileSync(path, "utf-8");

  // Expected result: the downloaded file contains only the 2 most recently created
  // notes: Third and Second.
  expect(content).toContain(third);
  expect(content).toContain(second);
  expect(content).not.toContain(first);
});

test("TC-037 Visitor sees error when entering an invalid export limit", async ({
  page,
  request,
}) => {
  // Precondition: the visitor is on the Export screen.
  const previousLimit = await getExportLimit(request);

  // Step: open the Export screen.
  await page.goto("/export");
  await expect(page.getByTestId("export-settings-form")).toBeVisible();

  // Step: enter 0 in export-limit-default-100-input.
  const limitInput = page.getByTestId("export-limit-default-100-input");
  await limitInput.fill("0");
  // Expected: the input shows 0.
  await expect(limitInput).toHaveValue("0");

  // Step: click save-limit-btn.
  await page.getByTestId("save-limit-btn").click();
  // Expected: the message 'Enter a positive whole number' shows.
  await expect(page.getByText("Enter a positive whole number", { exact: true })).toBeVisible();

  // Expected result: the export limit is not changed. Post-condition: the export limit
  // keeps its previous value.
  const currentLimit = await getExportLimit(request);
  expect(currentLimit).toBe(previousLimit);

  await page.reload();
  await expect(page.getByTestId("export-limit-default-100-input")).toHaveValue(
    String(previousLimit),
  );
});

test("TC-040 Unauthenticated visitor views and changes export limit", async ({ page }) => {
  // Precondition: the visitor has not signed in and holds no session. This app has no
  // sign-in at all (see frontend/src/api/openapi.json's description), so every test here
  // is already unauthenticated; no token or credential is set up or sent.

  // Step: open the Export screen without signing in.
  await page.goto("/export");
  // Expected: export-settings-form is shown with the current export limit.
  await expect(page.getByTestId("export-settings-form")).toBeVisible();
  await expect(page.getByTestId("export-limit-default-100-input")).toBeVisible();

  // Step: enter 7 in export-limit-default-100-input.
  const limitInput = page.getByTestId("export-limit-default-100-input");
  await limitInput.fill("7");
  // Expected: the input shows 7.
  await expect(limitInput).toHaveValue("7");

  // Step: click save-limit-btn.
  await page.getByTestId("save-limit-btn").click();
  // Expected: the message 'Export limit saved' shows, with no sign-in asked for anywhere
  // along the way.
  await expect(page.getByText("Export limit saved", { exact: true })).toBeVisible();
});
