import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a production build (`pnpm build` first).
 * Admin tests need E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for an owner/staff account; otherwise they are skipped.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } } },
  ],
  webServer: { command: "pnpm start -p 3000", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
