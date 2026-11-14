import { expect, test } from "@playwright/test";

test("filter URLs restore, normalize and reset without losing unrelated URL state", async ({
  page,
}) => {
  await page.goto(
    "/experiments?topic=forms&q=PIN&utm_source=review#main-content",
  );
  const category = page.getByRole("combobox", { name: "Category" });
  const query = page.getByRole("searchbox");
  const total = await page.locator(".listing-card").count();
  await expect(category).toContainText("Forms & input");
  await expect(query).toHaveValue("PIN");
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("topic"))
    .toBeNull();
  expect(new URL(page.url()).searchParams.get("category")).toBe(
    "Forms & input",
  );
  await query.press("Enter");
  await expect(query).toHaveValue("PIN");
  await page.reload();
  await expect(query).toHaveValue("PIN");
  await expect(category).toContainText("Forms & input");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(query).toHaveValue("");
  await expect(category).toContainText("All categories");
  await expect(page.getByRole("status")).toHaveText(`${total} experiments`);
  await expect(page.locator(".listing-card:visible")).toHaveCount(total);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  const url = new URL(page.url());
  expect(url.searchParams.get("category")).toBeNull();
  expect(url.searchParams.get("utm_source")).toBe("review");
  expect(url.hash).toBe("#main-content");
});

test("category and search share one result state across navigation", async ({
  page,
}) => {
  await page.goto("/experiments?category=unknown&q=COUNTER");
  const category = page.getByRole("combobox", { name: "Category" });
  await expect(category).toContainText("All categories");
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  await category.click();
  await page
    .getByRole("option", { name: "Browser capabilities", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("0 experiments");
  await expect(
    page.getByText("No experiments match.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".category-group:visible")).toHaveCount(0);
  await category.click();
  await page
    .getByRole("option", { name: "All categories", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  await page.locator('.listing-card[href="/experiments/counter"]').click();
  await expect(page).toHaveURL(/\/experiments\/counter\/?$/);
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("COUNTER");
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("searchbox").fill("qr code");
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  await expect(page.locator(".listing-card:visible")).toContainText(
    "QR Code Card",
  );
});

test("native SSR controls and all Experiments remain available before hydration", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4322/experiments");
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Category" })).toBeVisible();
  await expect(
    page.getByRole("option", { name: "All categories", exact: true }),
  ).toBeAttached();
  await expect(
    page.locator('.listing-card[href="/experiments/counter"]'),
  ).toBeVisible();
  await context.close();
});
