import { expect, test } from "@playwright/test";

test("handles microphone denial and keeps reference tones available", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: () => Promise.reject(new DOMException("Denied for test", "NotAllowedError")),
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Microphone access wasn’t allowed",
  );
  await page.getByRole("button", { name: "Play A reference tone", exact: true }).click();
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await expect(page.locator(".tuner-state")).toHaveText("Microphone off");
  await page.getByRole("button", { name: "Stop reference tone" }).click();
});

test("detects a synthetic guitar pitch and releases the microphone on navigation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => {
        const context = new AudioContext();
        await context.resume();
        const source = context.createOscillator();
        source.frequency.value = 110;
        const destination = context.createMediaStreamDestination();
        source.connect(destination);
        source.start();
        (window as unknown as { tunerTest: unknown }).tunerTest = {
          stream: destination.stream,
          source,
          context,
        };
        return destination.stream;
      },
    });
  });
  await page.goto("/tuner");
  await page.getByRole("button", { name: "Enable microphone" }).click();
  await expect(page.locator(".tuner-guidance")).toContainText("in tune", { timeout: 15000 });
  await expect(page.locator(".tuner-note")).toHaveText("A2");
  await page.evaluate(() => {
    (
      window as unknown as { tunerTest: { source: OscillatorNode } }
    ).tunerTest.source.frequency.value = 112;
  });
  await expect(page.locator(".tuner-guidance")).toContainText("Loosen a little");
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { tunerTest: { stream: MediaStream } }).tunerTest.stream
          .getTracks()
          .every((track) => track.readyState === "ended"),
      ),
    )
    .toBe(true);
  const ended = await page.evaluate(async () => {
    const testState = (
      window as unknown as {
        tunerTest: { stream: MediaStream; context: AudioContext; source: OscillatorNode };
      }
    ).tunerTest;
    const stopped = testState.stream.getTracks().every((track) => track.readyState === "ended");
    testState.source.stop();
    await testState.context.close();
    return stopped;
  });
  expect(ended).toBe(true);
});
