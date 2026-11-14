import path from "node:path";
import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./paths";

/**
 * Full admin flow: sign in → create product with discount + image → see it in the store → edit → delete.
 * Requires an owner/staff account: E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD. Skipped otherwise.
 * Uses the session saved by auth.setup.ts (one real login per run).
 * Creates and then deletes its own product (and uploaded image).
 */
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe("admin product management", () => {
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests");
  test.use({ storageState: ADMIN_STATE });

  test("create, view, edit and delete a product", async ({ page }, info) => {
    const stamp = `${info.project.name}-${Date.now().toString(36)}`;
    const name = `E2E Test Product ${stamp}`;
    const sku = `E2E-${stamp}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();

    await page.goto("/admin/products/new");
    await page.getByLabel("Product name").fill(name);
    await page.getByLabel("Short description").fill("Created by an automated test");
    await page.getByLabel("MRP (₹)").fill("2000");
    await page.getByRole("button", { name: "25%" }).click();
    await expect(page.getByText("₹1,500").first()).toBeVisible();
    await page.getByLabel("SKU").fill(sku);
    await page.getByLabel("Stock quantity").fill("12");
    await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures/product.png"));
    await expect(page.getByText("COVER", { exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page.getByText(/^Saved\./)).toBeVisible({ timeout: 30_000 });
    const editUrl = page.url();

    // Storefront shows it immediately with the discounted price
    await page.goto("/products?q=" + encodeURIComponent(stamp));
    await expect(page.getByText(name)).toBeVisible();
    await page.getByText(name).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByText("25% off").first()).toBeVisible();

    // Edit: change discount to 10%
    await page.goto(editUrl);
    await page.getByRole("button", { name: "10%" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText(/^Saved\./)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);

    // Delete (accept the confirm dialog)
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete permanently" }).click();
    await expect(page).toHaveURL(/\/admin\/products\?deleted=1/);
    await expect(page.getByText("Product deleted.")).toBeVisible();
  });

  test("orders, payments and revenue pages load", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Revenue today")).toBeVisible();
    await expect(page.getByText("Revenue, last 14 days")).toBeVisible();
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { level: 1, name: "Orders", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Unpaid / failed" }).click();
    await expect(page).toHaveURL(/filter=unpaid/);
    await page.goto("/admin/payments");
    await expect(page.getByRole("heading", { level: 1, name: "Payments", exact: true })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
