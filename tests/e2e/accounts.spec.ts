import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_STATE } from "./paths";

/**
 * Customer accounts across two "devices" (two separate browser contexts).
 * Test accounts use @example.invalid addresses and are cleaned up afterwards.
 * Never clicks Pay (no Razorpay orders are created).
 */

async function newDevice(browser: Browser, project: string) {
  const isMobile = project === "mobile";
  const ctx = await browser.newContext(isMobile ? { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  return ctx.newPage();
}

async function login(page: Page, email: string, password: string, next = "/my-orders") {
  await page.goto(`/account/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

test("customer account works across two devices", async ({ browser }, info) => {
  const stamp = `${info.project.name}-${Date.now().toString(36)}`;
  const email = `e2e-customer-${stamp}@example.invalid`;
  const password = "Test-pass-12345";

  // ── Device A: checkout requires login → register → back to checkout ──
  const a = await newDevice(browser, info.project.name);
  await a.goto("/products/card-wallet");
  await a.getByRole("button", { name: /add to cart/i }).click(); // guest cart
  await a.goto("/checkout");
  await expect(a).toHaveURL(/\/account\/login\?next=%2Fcheckout/);
  await a.getByRole("link", { name: "Create an account" }).click();
  await a.getByLabel("Full name").fill("E2E Customer");
  await a.getByLabel("Email").fill(email);
  await a.getByLabel("Mobile number").fill("9876543210");
  await a.getByLabel("Password", { exact: true }).fill(password);
  await a.getByLabel("Confirm password").fill(password);
  await a.getByRole("button", { name: "Create account" }).click();
  await expect(a).toHaveURL(/\/checkout$/);
  await expect(a.getByText(`Order updates go to ${email}`)).toBeVisible();
  await expect(a.getByText("Card Wallet").first()).toBeVisible(); // guest cart kept after signup

  // Validation happens server-side before any Razorpay call
  await a.getByRole("button", { name: /^Pay ₹/ }).click();
  await expect(a.getByText("Enter house / flat and street")).toBeVisible();

  // Wait for the cart to be saved to the account
  await a.waitForTimeout(1500);

  // ── Device B: same account → same cart and same "My orders" ──
  const b = await newDevice(browser, info.project.name);
  await login(b, email, password, "/cart");
  await expect(b).toHaveURL(/\/cart$/);
  await expect(b.getByText("Card Wallet").first()).toBeVisible();
  await b.goto("/my-orders");
  await expect(b.getByText("No orders yet")).toBeVisible();

  // Someone else's order is not visible
  await b.goto("/my-orders/6af828f9e850a07e9f4bd3b9");
  await expect(b.getByText("Order not found")).toBeVisible();

  // Log out on B → cart cleared on B only; log back in → cart returns
  await b.goto("/account");
  await b.getByRole("button", { name: "Log out" }).click();
  await expect(b).toHaveURL(/signedOut=1/);
  await b.goto("/cart");
  await expect(b.getByText("Your cart is empty")).toBeVisible();
  await login(b, email, password, "/cart");
  await expect(b.getByText("Card Wallet").first()).toBeVisible();

  // Account pages require login
  const c = await newDevice(browser, info.project.name);
  await c.goto("/my-orders");
  await expect(c).toHaveURL(/\/account\/login\?next=%2Fmy-orders/);

  // ── Admin sees the new customer ──
  const admin = await (await browser.newContext({ storageState: ADMIN_STATE })).newPage();
  await admin.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
  await expect(admin.getByText(email)).toBeVisible();

  for (const p of [a, b, c, admin]) await p.context().close();
});
