import { expect, test } from "@playwright/test";

/** Checkout access rules (full signed-in checkout is covered in accounts.spec.ts). Never clicks Pay. */
test("checkout requires login and keeps the cart", async ({ page }) => {
  await page.goto("/products/card-wallet");
  await page.getByRole("button", { name: /add to cart/i }).click();
  await page.goto("/cart");
  await page.getByRole("link", { name: /checkout securely/i }).click();
  await expect(page).toHaveURL(/\/account\/login\?next=%2Fcheckout/);
  await page.goto("/cart");
  await expect(page.getByText("Card Wallet").first()).toBeVisible();
  // The API refuses guests too (defence in depth)
  const res = await page.request.post("/api/checkout", { data: {}, headers: { Origin: new URL(page.url()).origin } });
  expect(res.status()).toBe(401);
});

test("order links without a valid token reveal nothing", async ({ page }) => {
  await page.goto("/orders/000000000000000000000000?t=forged");
  await expect(page.getByText("Order not found")).toBeVisible();
  await page.goto("/payment/success?order=000000000000000000000000&t=forged");
  await expect(page.getByText("Order not found")).toBeVisible();
});
