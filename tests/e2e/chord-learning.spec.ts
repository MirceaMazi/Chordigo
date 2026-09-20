import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("explores the complete library and filters chords", async ({ page }) => {
  await page.goto("/chords");
  await expect(page.locator(".chord-card")).toHaveCount(79);
  await page.getByRole("button", { name: "Minor", exact: true }).click();
  await expect(page.locator(".chord-card")).toHaveCount(12);
  await page.getByLabel("Search chords").fill("xyz");
  await expect(page.getByRole("heading", { name: "No chords found" })).toBeVisible();
  await page.getByRole("button", { name: "Show all chords" }).click();
  await page.getByRole("button", { name: "Explore D major", exact: true }).click();
  await expect(page.locator(".chord-detail h2")).toHaveText("D major");
  await page.getByRole("button", { name: "Test this shape" }).click();
  await expect(page.getByLabel("Chord to build")).toHaveValue("d-major-open");
});

test("scores a shape once, keeps playing scores separate, and restores backups idempotently", async ({
  page,
}) => {
  await page.goto("/chords?chord=c-major-open");
  await page.getByRole("button", { name: "Test this shape" }).click();
  await selectCMajorShape(page);
  await page.getByRole("button", { name: "Check chord" }).click();
  await expect(page.getByText("Correct. That shape is yours.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Check chord" })).toBeDisabled();
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page.locator(".stats-grid")).toContainText("Report a few changes to begin");
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  const c = page.locator(".skill-row").filter({ hasText: "C major" });
  await expect(c).toContainText("100%");
  await expect(c).toContainText("1 attempt");
  await page.getByText("Your progress belongs to you", { exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const download = await downloadPromise;
  const backup = await readFile((await download.path())!);
  await page.getByRole("button", { name: "Reset practice history" }).click();
  await page.getByRole("button", { name: "Keep my progress" }).click();
  await expect(c).toContainText("1 attempt");
  await page.getByRole("button", { name: "Reset practice history" }).click();
  await page.getByRole("button", { name: "Yes, clear history" }).click();
  await expect(c).toContainText("0 attempts");
  await page
    .getByLabel("Restore Chordigo backup")
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup });
  await expect(page.getByText(/Backup restored/)).toBeVisible();
  await expect(c).toContainText("1 attempt");
  await page
    .getByLabel("Restore Chordigo backup")
    .setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: backup });
  await expect(c).toContainText("1 attempt");
  await page.reload();
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await expect(c).toContainText("1 attempt");
});

test("records revealed shapes as review and handles incorrect fingerings", async ({ page }) => {
  await page.goto("/chords?chord=c-major-open");
  await page.getByRole("button", { name: "Test this shape" }).click();
  await page.getByRole("button", { name: "Reveal shape" }).click();
  await selectCMajorShape(page);
  await page.getByRole("button", { name: "Check chord" }).click();
  await expect(page.getByText("Shape matched. A helpful review.")).toBeVisible();
  await page.getByLabel("Chord to build").selectOption("f-major-compact");
  await selectCMajorShape(page);
  await page.getByRole("button", { name: "Check chord" }).click();
  await expect(page.getByText("Not yet. Take a look at the highlighted strings.")).toBeVisible();
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await expect(page.locator(".skill-row").filter({ hasText: "C major" })).toContainText(
    "0 attempts",
  );
  await expect(page.locator(".skill-row").filter({ hasText: "F major" })).toContainText("Focus");
});

test("finishes an eight-shape round and has no accidental keyboard submission", async ({
  page,
}) => {
  await page.goto("/chords");
  await page.getByRole("button", { name: "Shape trainer" }).click();
  for (let i = 0; i < 8; i++) await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByRole("heading", { name: "Eight small steps forward." })).toBeVisible();
  await page.getByRole("button", { name: "Another round" }).click();
  await expect(page.getByText("Shape 1 of 8")).toBeVisible();
});

async function selectCMajorShape(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Mute Low E string", exact: true }).click();
  await page.getByRole("button", { name: "Set A string fret 3", exact: true }).click();
  await page.getByRole("button", { name: "Set D string fret 2", exact: true }).click();
  await page.getByRole("button", { name: "Set B string fret 1", exact: true }).click();
}

test("starts with open horizontal strings and supports shapes higher on the neck", async ({
  page,
}) => {
  await page.goto("/chords");
  await page.getByLabel("Search chords").fill("Gb");
  await expect(page.getByRole("button", { name: "Explore F# major", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Shape trainer", exact: true }).click();
  await expect(page.getByText("6 strings sounding", { exact: true })).toBeVisible();
  const lowE = page.getByRole("button", { name: "Set Low E string fret 1", exact: true });
  const highE = page.getByRole("button", { name: "Set High E string fret 1", exact: true });
  const highE2 = page.getByRole("button", { name: "Set High E string fret 2", exact: true });
  const [low, high, next] = await Promise.all([
    lowE.boundingBox(),
    highE.boundingBox(),
    highE2.boundingBox(),
  ]);
  expect(low!.y).toBeGreaterThan(high!.y);
  expect(next!.y).toBe(high!.y);
  expect(next!.x).toBeGreaterThan(high!.x);
  await highE.click();
  await page.getByRole("button", { name: "Clear High E string fret 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mute High E string", exact: true })).toBeVisible();
  await page.getByLabel("Chord to build").selectOption("eb-major-movable");
  await page.getByRole("button", { name: "Mute Low E string", exact: true }).click();
  for (const [string, fret] of [
    ["A", 6],
    ["D", 8],
    ["G", 8],
    ["B", 8],
    ["High E", 6],
  ] as const)
    await page
      .getByRole("button", { name: `Set ${string} string fret ${fret}`, exact: true })
      .click();
  await page.getByRole("button", { name: "Check chord" }).click();
  await expect(page.getByText("Correct. That shape is yours.", { exact: true })).toBeVisible();
});
