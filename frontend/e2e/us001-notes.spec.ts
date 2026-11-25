import { expect, test } from "@playwright/test";

// US-001: creating a note through the New note form on the Notes screen. There is no
// sign-in for this app (see frontend/src/api/openapi.json's description), so every test
// here starts straight on "/".

test("TC-011 a note created via the form appears at the top of the shared list", async ({
  page,
}) => {
  await page.goto("/");

  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const bodyInput = page.getByTestId("body-max-2-000-characters-input");

  await titleInput.fill("Weekend hike");
  await expect(titleInput).toHaveValue("Weekend hike");

  await bodyInput.fill("Meet at the trailhead at 8am.");
  await expect(bodyInput).toHaveValue("Meet at the trailhead at 8am.");

  await page.getByTestId("save-note-btn").click();

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText("Weekend hike");

  const firstNote = list.locator(":scope > *").first();
  await expect(firstNote).toContainText("Weekend hike");
});

test("TC-013 submitting the form with an empty title shows a validation message and adds no note", async ({
  page,
}) => {
  await page.goto("/");

  const list = page.getByTestId("shared-notes-3-list");
  const emptyState = page.getByTestId("no-notes-yet-write-the-first-one-a-empty");
  await expect(list.or(emptyState)).toBeVisible();
  const hadNotesBefore = await list.isVisible();
  const beforeText = hadNotesBefore ? await list.innerText() : await emptyState.innerText();

  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  await expect(titleInput).toHaveValue("");

  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  await bodyInput.fill("Some body text.");
  await expect(bodyInput).toHaveValue("Some body text.");

  await page.getByTestId("save-note-btn").click();

  await expect(page.getByText("Title is required", { exact: true })).toBeVisible();

  const hasNotesAfter = await list.isVisible();
  expect(hasNotesAfter).toBe(hadNotesBefore);
  const afterText = hasNotesAfter ? await list.innerText() : await emptyState.innerText();
  expect(afterText).toBe(beforeText);
});

test("TC-015 the title input limits typed text to 100 characters", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");

  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  const longTitle = "A".repeat(150);
  const expectedTitle = "A".repeat(100);

  await titleInput.pressSequentially(longTitle);
  await expect(titleInput).toHaveValue(expectedTitle);

  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  await bodyInput.fill("Trip notes.");
  await expect(bodyInput).toHaveValue("Trip notes.");

  await page.getByTestId("save-note-btn").click();

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText(expectedTitle);
});

test("TC-017 the body input limits typed text to 2,000 characters", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");

  const titleInput = page.getByTestId("title-required-max-100-characters-input");
  await titleInput.fill("Long body test");
  await expect(titleInput).toHaveValue("Long body test");

  const bodyInput = page.getByTestId("body-max-2-000-characters-input");
  const longBody = "A".repeat(2050);
  const expectedBody = "A".repeat(2000);

  await bodyInput.pressSequentially(longBody);
  await expect(bodyInput).toHaveValue(expectedBody);

  await page.getByTestId("save-note-btn").click();

  const list = page.getByTestId("shared-notes-3-list");
  await expect(list).toContainText("Long body test");
  await expect(list).toContainText(expectedBody);
});
