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
  await second.getByRole("button", { name: "Set A string fret 2", exact: true }).click();
  await second.getByRole("button", { name: "Set D string fret 2", exact: true }).click();
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

test("keeps tutorials, the horizontal trainer and session reviews accessible on every viewport", async ({
  page,
}, testInfo) => {
  const audit = async (name: string, surface: string) => {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.locator(surface).screenshot({
      path: `test-results/screenshots/feedback-${name}-${testInfo.project.name}.png`,
    });
    await page.addStyleTag({ content: "* { background-image: none !important; }" });
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze())
        .violations,
    ).toEqual([]);
  };
  await page.goto("/practice");
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await expect(page.getByText("How to make your own routine", { exact: true })).toBeVisible();
  await audit("manual", ".routine-editor");
  await page.getByLabel("Beats for chord 1").selectOption("1");
  await page.getByLabel("Beats for chord 2").selectOption("1");
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Session length").selectOption("8");
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.getByRole("button", { name: "Save my review" })).toBeVisible({
    timeout: 15000,
  });
  await audit("review", ".session-recap");
  await page.getByRole("link", { name: "Chords", exact: true }).click();
  await page.getByRole("button", { name: "Shape trainer", exact: true }).click();
  await page.getByRole("button", { name: "Set A string fret 2", exact: true }).click();
  await page.getByRole("button", { name: "Set D string fret 2", exact: true }).click();
  await audit("trainer", ".trainer-workbench");
});

test("rolls back a failed session review and retries without duplicate evidence", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/practice");
  await page.getByRole("button", { name: "Session settings" }).click();
  await page.getByLabel("Time on each chord").selectOption("1");
  await page.getByLabel("Session length").selectOption("8");
  await page.getByLabel("Tempo in BPM").fill("160");
  await page.getByRole("button", { name: "Start practicing" }).click();
  await expect(page.getByText("Session saved on this device.", { exact: false })).toBeVisible({
    timeout: 15000,
  });
  await page.getByRole("button", { name: "All Em chords felt clean" }).click();
  await page.getByRole("button", { name: "All G chords felt clean" }).click();
  await page.evaluate(() => {
    const add = IDBObjectStore.prototype.add;
    let writes = 0;
    IDBObjectStore.prototype.add = function (...args: Parameters<typeof add>) {
      if (this.name === "observations" && ++writes === 2) {
        IDBObjectStore.prototype.add = add;
        this.transaction.abort();
      }
      return add.apply(this, args);
    };
  });
  await page.getByRole("button", { name: "Save my review" }).click();
  await expect(page.getByRole("button", { name: "Retry saving" })).toBeVisible();
  const countObservations = () =>
    page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const request = indexedDB.open("chordigo-practice");
          request.onsuccess = () => {
            const db = request.result;
            const count = db.transaction("observations").objectStore("observations").count();
            count.onsuccess = () => {
              resolve(count.result);
              db.close();
            };
          };
        }),
    );
  expect(await countObservations()).toBe(0);
  await page.getByRole("button", { name: "Retry saving" }).click();
  await expect(page.getByText("Your review is saved.", { exact: false })).toBeVisible();
  expect(await countObservations()).toBe(8);
  await expect(page.locator(".recap-metrics strong")).toHaveText(["0:03", "8", "0"]);
  expect(pageErrors).toEqual([]);
});
