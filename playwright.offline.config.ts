import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/offline",
  outputDir: "test-results/offline",
  workers: 1,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-offline", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-offline", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
