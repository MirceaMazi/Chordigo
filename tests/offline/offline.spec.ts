import { expect, test } from "@playwright/test";

test("loads every room and saves a complete practice with the network disconnected", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeEnabled();
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const registration = await navigator.serviceWorker.getRegistration("/");
          return registration?.active?.state;
        }),
      { timeout: 20_000 },
    )
    .toBe("activated");
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".offline-note")).toBeVisible();
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Time on each chord").selectOption("1");
  await page.getByLabel("Session length").selectOption("8");
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.getByText("Session saved on this device.", { exact: false })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("link", { name: "View progress" }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.reload();
  await expect(page.locator(".history-item")).toHaveCount(1);
  await page.getByRole("navigation").getByRole("link", { name: "Chords" }).click();
  await expect(page.locator(".chord-card")).toHaveCount(13);
  await page.goto("/chords?chord=d-major-open");
  await expect(page.locator(".chord-detail h2")).toHaveText("D major");
  await page.getByRole("button", { name: "Test this shape" }).click();
  await expect(page.getByRole("button", { name: "Check chord" })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "Tuner" }).click();
  await expect(page.getByRole("button", { name: "Enable microphone" })).toBeVisible();
  await page.getByRole("button", { name: "Play A reference tone", exact: true }).click();
  await expect(page.locator(".tuner-frequency")).toContainText("110.0");
  await context.setOffline(false);
  await page.getByRole("navigation").getByRole("link", { name: "Progress" }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});
