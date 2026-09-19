import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

await mkdir("test-results/screenshots", { recursive: true });
const browser = await chromium.launch();
for (const [label, viewport] of [
  ["desktop", { width: 1440, height: 1100 }],
  ["mobile", { width: 393, height: 852 }],
]) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: label === "mobile",
    hasTouch: label === "mobile",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["practice", "chords", "progress", "tuner"]) {
    await page.goto(`http://localhost:3000/${route}`);
    await page.locator(".loading-surface").waitFor({ state: "hidden" });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    console.log(JSON.stringify({ label, route, overflow, errors }));
    await page.screenshot({
      path: `test-results/screenshots/${route}-${label}.png`,
      fullPage: true,
    });
    if (route === "chords") {
      await page.getByRole("button", { name: "Shape trainer" }).click();
      await page.screenshot({
        path: `test-results/screenshots/trainer-${label}.png`,
        fullPage: true,
      });
    }
  }
  await context.close();
}
await browser.close();
