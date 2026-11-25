import { expect, test } from "@playwright/test";

// US-003: a friendly empty-state message shows when the shared store holds no notes, and
// is replaced by the notes list as soon as the first note is created. There is no
// sign-in for this app (see frontend/src/api/openapi.json's description), so every test
// here starts straight on "/".
//
// Both cases below need a truly empty shared store, which only the sandbox's clean
// database can guarantee, so they are tagged @sandbox-only and left out of the staging
// run. Each reaches the sandbox's own backend directly to drain whatever notes earlier
// tests left behind before checking the empty state, the same approach as TC-007 in
// us002-notes.spec.ts.

const backendUrl = "http://127.0.0.1:8000";

async function drainNotes(request: import("@playwright/test").APIRequestContext): Promise<void> {
  const existing: Array<{ id: string }> = await (await request.get(`${backendUrl}/notes`)).json();
  for (const note of existing) {
    await request.delete(`${backendUrl}/notes/${note.id}`);
  }
}

test("TC-002 visitor sees friendly empty-state message when no notes exist @sandbox-only", async ({
  page,
  request,
}) => {
  // Precondition: the shared store contains no notes.
  await drainNotes(request);

  // Step: open the app.
  await page.goto("/");

  await expect(page.getByTestId("notes-title")).toBeVisible();

  const emptyState = page.getByTestId("no-notes-yet-write-the-first-one-a-empty");
  await expect(emptyState).toBeVisible();
  await expect(emptyState).toContainText("No notes yet. Write the first one above.");

  // Expected: no notes list is shown.
  await expect(page.getByTestId("shared-notes-3-list")).not.toBeVisible();
});

test("TC-004 empty-state message is replaced by the list after creating a note @sandbox-only", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  // Preconditions: the shared store contains no notes, and the app is open showing the
  // empty-state message.
  await drainNotes(request);
  await page.goto("/");

  const emptyState = page.getByTestId("no-notes-yet-write-the-first-one-a-empty");
  await expect(emptyState).toBeVisible();

  const form = page.getByTestId("new-note-form");
  const titleInput = form.getByTestId("title-required-max-100-characters-input");
  const bodyInput = form.getByTestId("body-max-2-000-characters-input");

  await titleInput.fill("My first note");
  await expect(titleInput).toHaveValue("My first note");

  await bodyInput.fill("Hello world");
  await expect(bodyInput).toHaveValue("Hello world");

  await page.getByTestId("save-note-btn").click();

  // Expected: the empty state is no longer shown, and the notes list appears containing
  // exactly the one newly created note.
  await expect(emptyState).not.toBeVisible();

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toBeVisible();
  await expect(list).toContainText("My first note");

  const items = list.locator(":scope > *");
  await expect(items).toHaveCount(1);
});
