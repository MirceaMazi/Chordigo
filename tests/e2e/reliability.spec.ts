import { expect, test } from "@playwright/test";
import { AxeBuilder } from "@axe-core/playwright";

test("upgrades a version-one history without losing attempts", async ({ page }) => {
  await page.goto("/tuner");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("chordigo-practice", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        db.createObjectStore("observations", { keyPath: "id" });
        db.createObjectStore("skills", { keyPath: "voicingId" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(["observations", "skills"], "readwrite");
        tx.objectStore("observations").put({
          schemaVersion: 1,
          id: "legacy-1",
          sessionId: "legacy-session",
          context: "chord-trainer",
          source: "fret-selection",
          result: "correct",
          expectedVoicingId: "c-major-open",
          chordSymbol: "C",
          observedChordSymbols: ["C"],
          confidence: 1,
          createdAt: "2026-08-30T10:00:00.000Z",
        });
        tx.objectStore("skills").put({
          voicingId: "c-major-open",
          chordSymbol: "C",
          attempts: 1,
          correct: 1,
          incorrect: 0,
          reportedMisses: 0,
          uncertain: 0,
          lastPracticedAt: "2026-08-30T10:00:00.000Z",
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.getByRole("link", { name: "Progress", exact: true }).click();
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  await expect(page.locator(".skill-row").filter({ hasText: "C major" })).toContainText(
    "1 attempt",
  );
  const schema = await page.evaluate(
    () =>
      new Promise<{ version: number; stores: string[] }>((resolve) => {
        const request = indexedDB.open("chordigo-practice");
        request.onsuccess = () => {
          const db = request.result;
          resolve({ version: db.version, stores: [...db.objectStoreNames] });
          db.close();
        };
      }),
  );
  expect(schema.version).toBe(2);
  expect(schema.stores).toEqual(["observations", "routines", "sessions", "settings", "skills"]);
});

test("keeps other tabs up to date after a history change", async ({ page, context }) => {
  await page.goto("/progress");
  await page.getByRole("button", { name: "Shapes", exact: true }).click();
  const second = await context.newPage();
  await second.goto("/chords?chord=e-minor-open");
  await second.getByRole("button", { name: "Test this shape" }).click();
  await second.getByRole("button", { name: "Set Low E string open", exact: true }).click();
  await second.getByRole("button", { name: "Set A string fret 2", exact: true }).click();
  await second.getByRole("button", { name: "Set D string fret 2", exact: true }).click();
  for (const string of ["G", "B", "High E"])
    await second.getByRole("button", { name: `Set ${string} string open`, exact: true }).click();
  await second.getByRole("button", { name: "Check chord" }).click();
  await expect(page.locator(".skill-row").filter({ hasText: "E minor" })).toContainText(
    "1 attempt",
  );
});

test("rejects invalid backups without changing existing data", async ({ page }) => {
  await page.goto("/progress");
  await page.getByText("Your progress belongs to you", { exact: true }).click();
  await page.getByLabel("Restore Chordigo backup").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      '{"version":2,"observations":[{"id":"fake"}],"sessions":[],"routines":[],"settings":[]}',
    ),
  });
  await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid attempt");
  await expect(page.locator(".skill-row").first()).toContainText("0 attempts");
});

test("allows unsaved practice when browser storage is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", { get: () => undefined });
  });
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeEnabled();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("local storage");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.locator(".transport-state")).toHaveText("Count in");
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect(page.getByRole("heading", { name: "You showed up. That counts." })).toBeVisible();
  await expect(page.getByText("Your session could not be saved.", { exact: false })).toBeVisible();
});

test("keeps all screens within small viewports and exposes a single main landmark", async ({
  page,
}, testInfo) => {
  for (const route of ["practice", "chords", "progress", "tuner"]) {
    await page.goto(`/${route}`);
    await page.locator(".loading-surface").waitFor({ state: "hidden" });
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/screenshots/verified-${route}-${testInfo.project.name}.png`,
      fullPage: true,
    });
    // The low-opacity paper grain requires visual review. Measure text against
    // the underlying paper color while retaining the real page structure.
    await page.addStyleTag({ content: "* { background-image: none !important; }" });
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});

test("recovers queued session writes after a temporary storage failure", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("button", { name: "Start practicing" })).toBeEnabled();
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    Object.defineProperty(window, "restorePracticeStorage", {
      value: () => {
        IDBDatabase.prototype.transaction = transaction;
      },
    });
    IDBDatabase.prototype.transaction = function (...args: Parameters<typeof transaction>) {
      if (args[1] === "readwrite")
        throw new DOMException("Temporarily unavailable", "QuotaExceededError");
      return transaction.apply(this, args);
    };
  });
  await page.getByRole("button", { name: "Start practicing" }).click();
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { restorePracticeStorage: () => void }).restorePracticeStorage(),
  );
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByText("Session saved on this device.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "View progress" }).click();
  await expect(page.locator(".history-item")).toHaveCount(1);
});
