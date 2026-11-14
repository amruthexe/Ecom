import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a production build (`pnpm build` first).
 * Admin tests need E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD for an owner/staff account; otherwise they are skipped.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth.setup.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, dependencies: ["setup"] },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 900 } }, dependencies: ["setup"] },
  ],
  // Own port so tests never hit a developer's `pnpm dev` on :3000.
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { BETTER_AUTH_URL: `http://localhost:${PORT}`, NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}` },
  },
});
