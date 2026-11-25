import { expect, test, type Page } from "@playwright/test";

// US-002: the notes list is shared across every visitor and device, and always shows the
// newest note first. There is no sign-in for this app (see frontend/src/api/openapi.json's
// description), so every test here starts straight on "/".
//
// The suite's database is shared with other tests and other sprints, so a test never
// assumes the list holds only its own notes. TC-006 and TC-009 give each note a title
// unique to the run and check only the relative order of its own notes. TC-007 needs a
// truly empty store, which only the sandbox's clean database can guarantee, so it is
// tagged @sandbox-only and left out of the staging run.

async function createNote(page: Page, title: string, body: string): Promise<void> {
  await page.goto("/");
  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  await titleInput.fill(title);
  await bodyInput.fill(body);
  await page.getByTestId("save-note-btn").click();
  await expect(page.getByTestId("shared-notes-3-list")).toContainText(title);
}

test("TC-006 opening the app shows notes newest first", async ({ page }) => {
  const stamp = Date.now();
  const alpha = `Alpha ${stamp}`;
  const beta = `Beta ${stamp}`;
  const gamma = `Gamma ${stamp}`;

  // Preconditions: three notes already exist, created in this order: Alpha, Beta, Gamma.
  await createNote(page, alpha, "Alpha body.");
  await createNote(page, beta, "Beta body.");
  await createNote(page, gamma, "Gamma body.");

  // Step: open the app.
  await page.goto("/");

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toBeVisible();

  // Step: look at the order of notes in the list. Gamma (newest) is above Beta, which is
  // above Alpha (oldest), among this test's own notes.
  const text = await list.innerText();
  const gammaIndex = text.indexOf(gamma);
  const betaIndex = text.indexOf(beta);
  const alphaIndex = text.indexOf(alpha);

  expect(gammaIndex).toBeGreaterThan(-1);
  expect(betaIndex).toBeGreaterThan(-1);
  expect(alphaIndex).toBeGreaterThan(-1);

  expect(gammaIndex).toBeLessThan(betaIndex);
  expect(betaIndex).toBeLessThan(alphaIndex);
});

test("TC-007 empty list shows the empty state @sandbox-only", async ({ page, request }) => {
  test.setTimeout(60_000);
  // Precondition: no notes exist in the shared store. Only the sandbox's clean database
  // guarantees this; this test runs only in the sandbox (never on staging, hence
  // @sandbox-only), so it reaches the sandbox's own backend directly to drain whatever
  // notes earlier tests left behind before checking the empty state.
  const backendUrl = "http://127.0.0.1:8000";
  const existing: Array<{ id: string }> = await (await request.get(`${backendUrl}/notes`)).json();
  for (const note of existing) {
    await request.delete(`${backendUrl}/notes/${note.id}`);
  }

  await page.goto("/");

  const emptyState = page.getByTestId("no-notes-yet-write-the-first-one-a-empty");
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText("No notes yet. Write the first one above.");
});

test("TC-009 note created on one device appears at top for another device", async ({
  browser,
}) => {
  const stamp = Date.now();
  const existing = `Existing note ${stamp}`;
  const created = `New shared note ${stamp}`;

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  // Precondition: the shared store contains one note titled Existing note.
  await createNote(pageA, existing, "Pre-existing note.");

  // Step: on device A, fill the form and save the new note.
  await createNote(pageA, created, "Visible to everyone");

  const listA = pageA.getByTestId("shared-notes-3-list");
  const textA = await listA.innerText();
  const createdIndexA = textA.indexOf(created);
  const existingIndexA = textA.indexOf(existing);
  expect(createdIndexA).toBeGreaterThan(-1);
  expect(existingIndexA).toBeGreaterThan(-1);
  // Expected: New shared note appears at the top of the list on device A.
  expect(createdIndexA).toBeLessThan(existingIndexA);

  await contextA.close();

  // Step: on device B, a separate browser session, open the app.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/");

  const listB = pageB.getByTestId("shared-notes-3-list");
  await expect(listB).toBeVisible();

  const textB = await listB.innerText();
  const createdIndexB = textB.indexOf(created);
  const existingIndexB = textB.indexOf(existing);
  expect(createdIndexB).toBeGreaterThan(-1);
  expect(existingIndexB).toBeGreaterThan(-1);
  // Expected: New shared note appears above Existing note on device B too.
  expect(createdIndexB).toBeLessThan(existingIndexB);

  await contextB.close();
});
