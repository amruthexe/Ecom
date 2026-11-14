import { expect, test as setup } from "@playwright/test";
import { ADMIN_STATE } from "./paths";

/** Signs in through the real login form ONCE and saves the session for admin tests (respects the login rate limit). */


setup("sign in as admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  setup.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests");
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: ADMIN_STATE });
});
