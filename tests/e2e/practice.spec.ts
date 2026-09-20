import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeVisible();
});

test("counts in, accepts one report per chord, finishes and saves a real recap", async ({
  page,
}) => {
  await expect(page.locator(".chord-name")).toHaveText("Em");
  await expect(page.locator(".next-cue strong")).toHaveText(["G", "Em", "G"]);
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Time on each chord").selectOption("2");
  await page.getByRole("combobox", { name: "Feedback", exact: true }).selectOption("live");
  await page.getByLabel("Tempo in BPM").fill("120");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.locator(".transport-state")).toHaveText("Count in");
  await expect(page.getByRole("button", { name: "Got it" })).toBeDisabled();
  await expect(page.locator(".transport-state")).toHaveText("Playing", { timeout: 10000 });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".playing-feedback")).toContainText("1 clean");
  await expect(page.locator(".chord-name")).toHaveText("G");
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
  await page.getByRole("button", { name: "Remove Em", exact: true }).click();
  await page.getByRole("button", { name: "Repeat D after step 1", exact: true }).click();
  await page.getByLabel("Beats for chord 1").selectOption("2");
  await page.getByLabel("Routine name").fill("Evening changes");
  await page.getByLabel("Tempo in BPM").fill("75");
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(page.getByText("Routine saved", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await expect(page.locator(".sequence-chord strong")).toHaveText(["D", "D", "G"]);
  await expect(page.getByLabel("Beats for chord 1")).toHaveValue("2");
  await expect(page.getByLabel("Tempo in BPM")).toHaveValue("75");
  await expect(page.getByLabel("Routine name")).toHaveValue("Evening changes");
  await page.getByLabel("Progression", { exact: true }).selectOption("first-changes");
  await expect(page.locator(".sequence-chord strong")).toHaveText(["Em", "G"]);
  await page.getByLabel("Progression", { exact: true }).selectOption({ label: "Evening changes" });
  await expect(page.locator(".sequence-chord strong")).toHaveText(["D", "D", "G"]);
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

test("keeps practice hands free and saves one honest review after playing", async ({ page }) => {
  await page.getByRole("button", { name: "Session settings" }).click();
  await expect(page.getByRole("combobox", { name: "Feedback", exact: true })).toHaveValue(
    "after-session",
  );
  await page.getByLabel("Time on each chord").selectOption("1");
  await page.getByLabel("Session length").selectOption("8");
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.getByRole("button", { name: "Got it" })).toHaveCount(0);
  await expect(page.locator(".transport-state")).toHaveText("Playing", { timeout: 10000 });
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("heading", { name: "Guitar down. How did those chords feel?" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".recap-metrics strong")).toHaveText(["0:03", "0", "0"]);
  await page.getByRole("button", { name: "All Em chords felt clean" }).click();
  await page.getByLabel("Clean G chords").selectOption("2");
  await page.getByRole("button", { name: "Save my review" }).click();
  await expect(page.getByText("Your review is saved.", { exact: false })).toBeVisible();
  await expect(page.locator(".recap-metrics strong")).toHaveText(["0:03", "6", "2"]);
  await page.getByRole("link", { name: "View progress" }).click();
  await page.waitForURL("**/progress");
  await page.reload();
  await expect(page.locator(".stats-grid")).toContainText("75%");
  await expect(page.locator(".stats-grid")).toContainText("From 8 explicit playing reports");
  await page.locator(".history-item summary").click();
  await expect(page.getByText("Your review is saved.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save my review" })).toHaveCount(0);
});

test("can review a session later from the journal without scoring skipped chords", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Time on each chord").selectOption("1");
  await page.getByLabel("Session length").selectOption("8");
  await page.getByLabel("Repeat each chord").selectOption("2");
  await expect(page.locator(".next-cue strong")).toHaveText(["Em", "G", "G"]);
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.getByText("Session saved on this device.", { exact: false })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("link", { name: "View progress" }).click();
  await page.waitForURL("**/progress");
  await page.reload();
  await page.locator(".history-item summary").click();
  await page.getByLabel("Clean Em chords").selectOption("0");
  await page.getByRole("button", { name: "Save my review" }).click();
  await expect(page.locator(".stats-grid")).toContainText("From 4 explicit playing reports");
  await expect(page.locator(".skill-row").filter({ hasText: "G major" })).toContainText(
    "0 attempts",
  );
});

test("adjusts tapped tempos by one BPM and allows replacing or resetting the number", async ({
  page,
}) => {
  const tempo = page.getByLabel("Tempo in BPM");
  await page.getByRole("button", { name: "Tap tempo", exact: true }).click();
  await page.waitForTimeout(890);
  await page.getByRole("button", { name: "Tap tempo", exact: true }).click();
  const tapped = Number(await tempo.inputValue());
  expect(tapped).toBeGreaterThan(40);
  expect(tapped).toBeLessThan(160);
  await page.getByRole("button", { name: "Decrease tempo by one BPM" }).click();
  await expect(tempo).toHaveValue(String(tapped - 1));
  await tempo.fill("");
  await expect(tempo).toHaveValue("");
  await tempo.fill("99");
  // Clicking a control commits the typed value and still performs that click.
  await page.getByRole("button", { name: "Increase tempo by one BPM" }).click();
  await expect(tempo).toHaveValue("100");
  await page.getByRole("button", { name: "Reset tempo to 60 BPM" }).click();
  await expect(tempo).toHaveValue("60");
  // IndexedDB commits asynchronously; wait for persistence before reloading the document.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve) => {
            const request = indexedDB.open("chordigo-practice");
            request.onsuccess = () => {
              const db = request.result;
              const preferences = db
                .transaction("settings")
                .objectStore("settings")
                .get("preferences");
              preferences.onsuccess = () => {
                resolve(preferences.result.bpm);
                db.close();
              };
            };
          }),
      ),
    )
    .toBe(60);
  await page.reload();
  await expect(tempo).toHaveValue("60");
});
