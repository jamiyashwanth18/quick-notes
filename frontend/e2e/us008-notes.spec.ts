import { expect, test, type Page } from "@playwright/test";

// US-008: the app is free to use -- creating, viewing and deleting a note never shows a
// payment or subscription prompt -- and it needs no sign-in at all: every device sees
// the same single shared list of notes (see frontend/src/api/openapi.json's
// description). Every test here starts straight on "/".
//
// The suite's database is shared with other tests and other sprints, so a test never
// assumes the list holds only its own notes. Each test gives its note a title unique to
// the run (a timestamp suffix) so it can always be told apart from anything already in
// the shared store. "No payment or subscription prompt appears" is checked by asserting
// that no text mentioning payment, billing or subscription is visible anywhere on the
// page at each step, alongside the step's own expected outcome.

const paymentWording = /pay|billing|subscri|checkout|credit card|upgrade/i;

async function expectNoPaymentPrompt(page: Page): Promise<void> {
  await expect(page.getByText(paymentWording)).toHaveCount(0);
}

function newestNoteItem(page: Page) {
  const list = page.getByTestId("shared-notes-3-list");
  return list.locator(":scope > *").first();
}

test("TC-042 Visitor can create, view and delete a note with no payment prompt", async ({
  page,
}) => {
  const title = `Grocery list ${Date.now()}`;

  // Precondition: the Notes screen is open, and at least one note already exists so the
  // list is not empty.
  await page.goto("/");
  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const bodyInput = page.getByTestId("body-max-2-000-characters-input");

  const precondition = `Pre-existing note ${Date.now()}`;
  await titleInput.fill(precondition);
  await bodyInput.fill("Keeps the list from being empty.");
  await page.getByTestId("save-note-btn").click();
  await expect(page.getByTestId("shared-notes-3-list")).toContainText(precondition);
  await expectNoPaymentPrompt(page);

  // Step: fill in title-required-max-100-characters-input with 'Grocery list'.
  await titleInput.fill(title);
  // Expected: the title field shows the entered text; no payment or subscription prompt.
  await expect(titleInput).toHaveValue(title);
  await expectNoPaymentPrompt(page);

  // Step: fill in body-max-2-000-characters-input with 'Milk, eggs, bread'.
  await bodyInput.fill("Milk, eggs, bread");
  // Expected: the body field shows the entered text; no payment or subscription prompt.
  await expect(bodyInput).toHaveValue("Milk, eggs, bread");
  await expectNoPaymentPrompt(page);

  // Step: click save-note-btn.
  await page.getByTestId("save-note-btn").click();
  // Expected: the note is saved and appears in shared-notes-3-list; no payment prompt.
  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(title);
  await expectNoPaymentPrompt(page);

  // Step: click delete-note-btn on the note just created.
  const item = newestNoteItem(page);
  await expect(item).toContainText(title);
  await item.locator('input[name="note-select"]').check();
  await page.getByTestId("delete-note-btn").click();
  // Expected: the delete-this-note-this-cannot-be-un-modal confirmation shows; no
  // payment or subscription prompt appears.
  const modal = page.getByTestId("delete-this-note-this-cannot-be-un-modal");
  await expect(modal).toBeVisible();
  await expect(modal).toContainText("Delete this note? This cannot be undone.");
  await expectNoPaymentPrompt(page);

  // Step: confirm the deletion in the modal.
  await modal.getByRole("button", { name: "Delete permanently", exact: true }).click();
  // Expected: the message 'Note deleted permanently. There is no undo.' shows; no
  // payment or subscription prompt appears.
  await expect(page.getByText("Note deleted permanently. There is no undo.")).toBeVisible();
  await expectNoPaymentPrompt(page);

  // Post-condition: the note created during the test no longer appears in the list.
  await expect(page.getByText(title)).not.toBeVisible();
});

test("TC-044 Visitor on two different devices sees the same shared list with no sign-in", async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const stamp = Date.now();
  const existingTitle = `Team meeting notes ${stamp}`;
  const deviceBTitle = `From device B ${stamp}`;

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();

  // Precondition: a note titled 'Team meeting notes' already exists in the shared store.
  await pageA.goto("/");
  await pageA.getByTestId("title-required-max-100-characters-input").fill(existingTitle);
  await pageA.getByTestId("body-max-2-000-characters-input").fill("Minutes from the meeting.");
  await pageA.getByTestId("save-note-btn").click();
  await expect(pageA.getByTestId("shared-notes-3-list")).toContainText(existingTitle);

  // Step: open the app on device A.
  await pageA.goto("/");
  // Expected: notes-title heading shows and shared-notes-3-list shows the existing
  // notes including 'Team meeting notes'; no sign-in step is shown.
  await expect(pageA.getByTestId("notes-title")).toBeVisible();
  await expect(pageA.getByTestId("shared-notes-3-list")).toContainText(existingTitle);
  await expect(pageA.getByRole("textbox", { name: /password/i })).toHaveCount(0);

  // Step: open the app on device B, a different browser session.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  await pageB.goto("/");
  // Expected: notes-title heading shows and shared-notes-3-list shows the same notes
  // including 'Team meeting notes'; no sign-in step is shown.
  await expect(pageB.getByTestId("notes-title")).toBeVisible();
  await expect(pageB.getByTestId("shared-notes-3-list")).toContainText(existingTitle);
  await expect(pageB.getByRole("textbox", { name: /password/i })).toHaveCount(0);

  // Step: on device B, fill in title and body, then click save-note-btn.
  await pageB.getByTestId("title-required-max-100-characters-input").fill(deviceBTitle);
  await pageB.getByTestId("body-max-2-000-characters-input").fill("Added on device B");
  await pageB.getByTestId("save-note-btn").click();
  // Expected: the note is saved and appears in shared-notes-3-list on device B.
  await expect(pageB.getByTestId("shared-notes-3-list")).toContainText(deviceBTitle);

  // Step: reload the app on device A.
  await pageA.reload();
  // Expected: shared-notes-3-list on device A now shows the 'From device B' note,
  // without any sign-in step.
  await expect(pageA.getByTestId("shared-notes-3-list")).toContainText(deviceBTitle);
  await expect(pageA.getByRole("textbox", { name: /password/i })).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});
