import { expect, test } from "@playwright/test";

/**
 * Checkout UI. Never completes a payment.
 * With working Razorpay keys the Razorpay window opens (we stop there);
 * with missing/invalid keys the customer sees a clear "temporarily unavailable" message.
 * Test orders use the e2e-checkout@example.invalid address so they can be cleaned up.
 */
test("checkout validates details and starts payment safely", async ({ page }) => {
  await page.goto("/products/card-wallet");
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/cart");
  await page.getByRole("link", { name: /checkout securely/i }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByText("Card Wallet").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pay ₹/ })).toBeEnabled();

  // Invalid details → field errors, nothing charged
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByLabel("PIN code").fill("012");
  await page.getByRole("button", { name: /^Pay ₹/ }).click();
  await expect(page.getByText("Enter a 10-digit Indian mobile number")).toBeVisible();
  await expect(page.getByText("Enter a 6-digit PIN code")).toBeVisible();
  await expect(page.getByText("Enter your full name")).toBeVisible();

  // Valid details
  await page.getByLabel("Full name").fill("E2E Checkout Test");
  await page.getByLabel("Email").fill("e2e-checkout@example.invalid");
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByLabel("House / flat, building, street").fill("1 Test Street");
  await page.getByLabel("PIN code").fill("560001");
  await page.getByLabel("City").fill("Bengaluru");
  await page.getByLabel("State").selectOption("Karnataka");
  await page.getByRole("button", { name: /^Pay ₹/ }).click();

  const razorpayFrame = page.locator("iframe.razorpay-checkout-frame");
  const unavailable = page.getByText(/temporarily unavailable/i);
  await expect(razorpayFrame.or(unavailable).first()).toBeVisible({ timeout: 20_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("order links without a valid token reveal nothing", async ({ page }) => {
  await page.goto("/orders/000000000000000000000000?t=forged");
  await expect(page.getByText("Order not found")).toBeVisible();
  await page.goto("/payment/success?order=000000000000000000000000&t=forged");
  await expect(page.getByText("Order not found")).toBeVisible();
});
