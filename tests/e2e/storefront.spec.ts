import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(1);
}

const ROUTES = ["/", "/products", "/products/core-heavyweight-tee", "/categories/apparel", "/cart", "/admin/login"];

for (const route of ROUTES) {
  test(`no horizontal overflow on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalOverflow(page);
  });
}

test("add a variant product to the cart", async ({ page }) => {
  await page.goto("/products/core-heavyweight-tee");
  const add = page.getByRole("button", { name: /select size|add to cart/i });
  await expect(add).toBeDisabled();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "Black", exact: true }).click();
  await page.getByRole("button", { name: /add to cart/i }).click();
  await expect(page.getByText("Added to your cart")).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Core Heavyweight Tee")).toBeVisible();
  await expect(page.getByText("M / Black")).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByText("₹2,398").first()).toBeVisible(); // 2 × ₹1,199
  await page.getByRole("button", { name: /remove core heavyweight tee/i }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("search suggestions and filters", async ({ page, isMobile }) => {
  await page.goto("/products?category=tech&sort=price-asc");
  await expect(page.getByText(/3\s*products/)).toBeVisible();
  if (!isMobile) {
    await page.getByRole("combobox", { name: "Search products" }).first().fill("leath");
    await expect(page.getByRole("option", { name: /court low leather/i })).toBeVisible();
  }
});

test("admin redirects anonymous visitors to login", async ({ page }) => {
  await page.goto("/admin/products");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Vevvion/ })).toBeVisible();
});

test("admin login rejects bad credentials", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(`nobody-${Date.now()}@example.invalid`);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});
