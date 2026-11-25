import { expect, test, type Page } from "@playwright/test";

// US-004: deleting a note from the shared list goes through a confirmation prompt, and
// once confirmed the note is permanently gone for every visitor, with no undo. There is
// no sign-in for this app (see frontend/src/api/openapi.json's description), so every
// test here starts straight on "/".
//
// The suite's database is shared with other tests and other sprints, so a test never
// assumes the list holds only its own notes. Each test gives its note a title unique to
// the run (the case's title plus a timestamp) and finds that exact note in the list
// before acting on it.

async function createNote(page: Page, title: string, body: string): Promise<void> {
  await page.goto("/");
  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  await titleInput.fill(title);
  await bodyInput.fill(body);
  await page.getByTestId("save-note-btn").click();
  await expect(page.getByTestId("shared-notes-3-list")).toContainText(title);
}

// A note just created through the form is the newest, and US-002 puts the newest note
// at the top of the shared list, so the just-created note is always the list's first
// top-level item.
function newestNoteItem(page: Page) {
  const list = page.getByTestId("shared-notes-3-list");
  return list.locator(":scope > *").first();
}

// Each note has a "select" radio, and the single, page-level delete-note-btn acts on the
// currently selected note: select the note, then click the button to open the
// confirmation modal.
async function selectAndStartDelete(page: Page, title: string): Promise<void> {
  const item = newestNoteItem(page);
  await expect(item).toContainText(title);
  await item.locator('input[name="note-select"]').check();
  await page.getByTestId("delete-note-btn").click();
}

test("TC-045 Delete button shows confirmation prompt before note is removed", async ({
  page,
}) => {
  const title = `Pick up dry cleaning ${Date.now()}`;

  // Precondition: a note titled 'Pick up dry cleaning' exists in the shared list.
  await createNote(page, title, "Dry cleaning body.");

  // Step: open the Notes screen.
  await page.goto("/");
  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(title);

  // Step: click delete-note-btn on the note.
  await selectAndStartDelete(page, title);

  // Expected: the confirmation message shows in the modal.
  const modal = page.getByTestId("delete-this-note-this-cannot-be-un-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Delete this note? This cannot be undone.");

  // Step: check the note list without confirming or cancelling.
  // Expected: the note is still shown and nothing has been removed.
  await expect(list).toContainText(title);
});

test("TC-048 Confirming deletion removes the note for every visitor without a reload", async ({
  browser,
}) => {
  const title = `Grocery list ${Date.now()}`;

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  // Precondition: a note titled 'Grocery list' exists in the shared list, visible to all.
  await createNote(pageA, title, "Grocery list body.");

  // Step: as Visitor A, open the Notes screen.
  await pageA.goto("/");
  const listA = pageA.getByTestId("shared-notes-3-list");
  await expect(listA).toContainText(title);

  // Step: click delete-note-btn on the note.
  await selectAndStartDelete(pageA, title);

  const modalA = pageA.getByTestId("delete-this-note-this-cannot-be-un-modal");
  await expect(modalA).toBeVisible();
  await expect(modalA).toContainText("Delete this note? This cannot be undone.");

  // Step: confirm the deletion in the modal.
  await modalA.getByRole("button", { name: "Delete permanently", exact: true }).click();

  // Expected: the deletion message shows, and the note disappears immediately, without a
  // page reload.
  await expect(pageA.getByText("Note deleted permanently. There is no undo.")).toBeVisible();
  await expect(pageA.getByText(title)).not.toBeVisible();

  await contextA.close();

  // Step: as Visitor B, open the Notes screen on a separate browser session.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/");

  // Expected: the note does not appear anywhere in Visitor B's list.
  await expect(pageB.getByText(title)).not.toBeVisible();

  await contextB.close();
});

test("TC-050 Cancelling the delete prompt keeps the note in the list", async ({ page }) => {
  const title = `Buy birthday gift ${Date.now()}`;

  // Precondition: a note titled 'Buy birthday gift' exists in the shared list.
  await createNote(page, title, "Birthday gift body.");

  // Step: open the Notes screen.
  await page.goto("/");
  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(title);

  // Step: click delete-note-btn on the note.
  await selectAndStartDelete(page, title);

  const modal = page.getByTestId("delete-this-note-this-cannot-be-un-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Delete this note? This cannot be undone.");

  // Step: click the cancel option in the modal.
  await modal.getByRole("button", { name: "Cancel", exact: true }).click();

  // Expected: the modal closes and the note is still shown, without the page reloading.
  await expect(modal).not.toBeVisible();
  await expect(list).toContainText(title);
});

test("TC-052 A deleted note stays gone and cannot be undone after reloading", async ({
  page,
}) => {
  const title = `Pay electricity bill ${Date.now()}`;

  // Precondition: a note titled 'Pay electricity bill' exists in the shared list.
  await createNote(page, title, "Electricity bill body.");

  // Step: open the Notes screen.
  await page.goto("/");
  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(title);

  // Step: click delete-note-btn on the note.
  await selectAndStartDelete(page, title);

  const modal = page.getByTestId("delete-this-note-this-cannot-be-un-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Delete this note? This cannot be undone.");

  // Step: confirm the deletion in the modal.
  await modal.getByRole("button", { name: "Delete permanently", exact: true }).click();

  // Expected: the deletion message shows, the note is gone, and no undo option is offered.
  await expect(page.getByText("Note deleted permanently. There is no undo.")).toBeVisible();
  await expect(page.getByText(title)).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);

  // Step: reload the Notes screen.
  await page.reload();

  // Expected: the note still does not appear anywhere in the list.
  await expect(page.getByText(title)).not.toBeVisible();
});
