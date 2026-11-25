import { expect, test, type Page } from "@playwright/test";

// US-005: a visitor can export every note as one Markdown file, downloaded straight to
// their device with no email or cloud-delivery step, named from today's date, and with a
// friendly message instead of a forced empty file when there are no notes to export.
// There is no sign-in for this app (see frontend/src/api/openapi.json's description), so
// every test here starts straight on "/" before moving to "/export".

async function createNote(page: Page, title: string, body: string): Promise<void> {
  await page.goto("/");
  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  await titleInput.fill(title);
  await bodyInput.fill(body);
  await page.getByTestId("save-note-btn").click();

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(title);

  // Expected: the note appears at the top of the notes list.
  const firstNote = list.locator(":scope > *").first();
  await expect(firstNote).toContainText(title);
}

test("TC-025 Downloading the export gives one file to the device", async ({ page }) => {
  const title = `Weekend plans ${Date.now()}`;

  // Precondition: a note titled 'Weekend plans' exists in the shared list.
  await createNote(page, title, "Hike on Saturday, brunch on Sunday");

  // Step: open the Export screen.
  await page.goto("/export");
  await expect(page.getByTestId("export-title")).toBeVisible();

  // Track every download that fires while this test interacts with the screen, so a
  // second, unexpected download would be caught alongside the one we wait for below.
  const downloadNames: string[] = [];
  page.on("download", (download) => {
    downloadNames.push(download.suggestedFilename());
  });

  // Step: click download-markdown-btn.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-markdown-btn").click(),
  ]);

  // Expected: a single Markdown file downloads directly to the device through the
  // browser, with no email field, address, or cloud-upload step shown anywhere.
  expect(download.suggestedFilename()).toMatch(/\.md$/);
  expect(downloadNames).toHaveLength(1);

  // No email field or address to send the export to, and no cloud-upload step: just the
  // browser's own download, nothing else offered after clicking the button.
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(/upload to the cloud|cloud upload|cloud storage/i)).toHaveCount(0);
});

test("TC-027 Export screen shows and downloads today's dated filename", async ({ page }) => {
  const title = `Trip notes ${Date.now()}`;

  // Precondition: a note titled 'Trip notes' exists in the shared list, and today's date
  // is 2026-11-25.
  await createNote(page, title, "Pack sunscreen");

  // Step: open the Export screen.
  await page.goto("/export");

  // Expected: the card shows the file name derived from today's date.
  const card = page.getByTestId("one-markdown-file-named-from-today-card");
  await expect(card).toContainText(
    "One Markdown file, named from today's date: 2026-11-25-notes.md",
  );

  // Step: click download-markdown-btn.
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTestId("download-markdown-btn").click(),
  ]);

  // Expected: the file that downloads to the device is named 2026-11-25-notes.md.
  expect(download.suggestedFilename()).toBe("2026-11-25-notes.md");
});

test("TC-029 Visitor is told there is nothing to export @sandbox-only", async ({
  page,
  request,
}) => {
  // Precondition: the shared notes store contains no notes. Only the sandbox's clean
  // database guarantees this, so this test runs only in the sandbox (never on staging,
  // hence @sandbox-only) and reaches the sandbox's own backend directly to drain
  // whatever notes earlier tests left behind, the same approach as TC-007 in
  // us002-notes.spec.ts.
  const backendUrl = "http://127.0.0.1:8000";
  const existing: Array<{ id: string }> = await (await request.get(`${backendUrl}/notes`)).json();
  for (const note of existing) {
    await request.delete(`${backendUrl}/notes/${note.id}`);
  }
  // Step: open the Export screen.
  await page.goto("/export");
  await expect(page.getByTestId("export-title")).toBeVisible();

  let downloadFired = false;
  page.on("download", () => {
    downloadFired = true;
  });

  // Step: click download-markdown-btn.
  await page.getByTestId("download-markdown-btn").click();

  // Expected: the message 'Nothing to export yet' shows, and no file is downloaded.
  await expect(page.getByText("Nothing to export yet", { exact: true })).toBeVisible();
  expect(downloadFired).toBe(false);
});
