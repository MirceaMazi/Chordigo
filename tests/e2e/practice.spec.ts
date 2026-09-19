import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeVisible();
});

test("counts in, accepts one report per chord, finishes and saves a real recap", async ({
  page,
}) => {
  await expect(page.locator(".chord-name")).toHaveText("Em");
  await expect(page.locator(".next-cue strong")).toHaveText(["Am", "Em", "Am"]);
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Time on each chord").selectOption("2");
  await page.getByLabel("Tempo in BPM").fill("120");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.locator(".transport-state")).toHaveText("Count in");
  await expect(page.getByRole("button", { name: "Got it" })).toBeDisabled();
  await expect(page.locator(".transport-state")).toHaveText("Playing", { timeout: 10000 });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".playing-feedback")).toContainText("1 clean");
  await expect(page.locator(".chord-name")).toHaveText("Am");
  await page.keyboard.press("Space");
  await expect(page.locator(".playing-feedback")).toContainText("1 missed");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "You showed up. That counts." })).toBeVisible();
  await expect(page.getByText("Session saved on this device.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "View progress" }).click();
  await expect(page.locator(".stats-grid")).toContainText("50%");
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.locator(".history-item summary").click();
  await expect(page.locator(".history-detail")).toContainText(
    "1 reported clean · 1 reported missed",
  );
});

test("automatically completes a finite session without inventing successful changes", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Time on each chord").selectOption("1");
  await page.getByLabel("Session length").selectOption("8");
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.getByRole("heading", { name: "You showed up. That counts." })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator(".recap-metrics strong")).toHaveText(["0:03", "0", "0"]);
  await page.getByRole("link", { name: "View progress" }).click();
  await expect(page.locator(".stats-grid")).toContainText("Report a few changes to begin");
  await page.locator(".history-item summary").click();
  await expect(page.locator(".history-detail")).toContainText("8 full chord steps practiced");
});

test("persists custom ordering, durations, named routines and preferences across a reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await page.getByLabel("Chord to add").selectOption("d-major-open");
  await page.getByRole("button", { name: "Add chord to sequence" }).click();
  await page.getByRole("button", { name: "Move D left", exact: true }).click();
  await page.getByRole("button", { name: "Remove C", exact: true }).click();
  await page.getByLabel("Beats for chord 1").selectOption("2");
  await page.getByLabel("Routine name").fill("Evening changes");
  await page.getByLabel("Tempo in BPM").fill("75");
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(page.getByText("Routine saved", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await expect(page.locator(".sequence-chord strong")).toHaveText(["G", "Am", "D", "Em"]);
  await expect(page.getByLabel("Beats for chord 1")).toHaveValue("2");
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("75");
  await expect(page.getByLabel("Routine name")).toHaveValue("Evening changes");
  await page.getByLabel("Progression", { exact: true }).selectOption("first-changes");
  await expect(page.locator(".sequence-chord strong")).toHaveText(["Em", "Am"]);
  await page.getByLabel("Progression", { exact: true }).selectOption({ label: "Evening changes" });
  await expect(page.locator(".sequence-chord strong")).toHaveText(["G", "Am", "D", "Em"]);
});

test("ends audio and checkpoints a session when navigating away", async ({ page }) => {
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.locator(".transport-state")).toHaveText("Playing", { timeout: 10000 });
  await page.keyboard.press("ArrowRight");
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await expect(page.locator(".history-item")).toContainText("Finished when you left the page");
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await expect(page.locator(".transport-state")).toHaveText("Ready when you are");
});
