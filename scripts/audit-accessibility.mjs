import { chromium } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir("test-results", { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const width of [1280, 393]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  for (const route of ["practice", "chords", "progress", "tuner"]) {
    await page.goto(`http://localhost:3000/${route}`);
    await page.locator(".loading-surface").waitFor({ state: "hidden" });
    // Measure the paper's base colors; the decorative grain otherwise makes
    // axe defer text contrast to a human review. The actual texture is inspected
    // separately in the unmodified screenshots.
    await page.addStyleTag({ content: "* { background-image: none !important; }" });
    if (route === "practice") await page.getByRole("button", { name: "Session settings" }).click();
    for (const state of route === "chords" ? ["library", "trainer"] : ["default"]) {
      if (state === "trainer") await page.getByRole("button", { name: "Shape trainer" }).click();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
        .analyze();
      results.push({
        width,
        route,
        state,
        violations: result.violations,
        incomplete: result.incomplete,
      });
      console.log(
        JSON.stringify({
          width,
          route,
          state,
          violations: result.violations.map(({ id, nodes }) => ({
            id,
            count: nodes.length,
          })),
        }),
      );
    }
  }
  await context.close();
}
await writeFile("test-results/accessibility.json", JSON.stringify(results, null, 2));
await browser.close();
process.exitCode = results.some((result) => result.violations.length > 0) ? 1 : 0;
