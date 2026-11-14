import { expect, test } from "@playwright/test";

test("filters wait for hydration so early typing is never discarded", async ({
  page,
}) => {
  let release = () => {};
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/\/_astro\/.*\.js/, async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto("/experiments", { waitUntil: "commit" });
  const query = page.getByRole("searchbox");
  try {
    await expect(query).toBeDisabled();
    await expect(
      page.getByRole("combobox", { name: "Category" }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(query).toBeEnabled();
  await query.fill("counter");
  await expect(page.getByRole("status")).toHaveText("1 experiment");
});

test("cards stay still and filter feedback keeps keyboard focus useful", async ({
  page,
}) => {
  await page.goto("/experiments");
  const category = page.getByRole("combobox", { name: "Category" });
  await expect(category).toContainText("All categories");
  const clear = page.getByRole("button", { name: "Clear filters" });
  await expect(clear).toBeDisabled();
  const card = page.locator(".listing-card").first();
  await card.scrollIntoViewIfNeeded();
  const before = await card.boundingBox();
  await card.hover();
  await expect.poll(async () => (await card.boundingBox())!.y).toBe(before!.y);
  await card.focus();
  await expect(card).toBeFocused();
  expect(await card.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
    "solid",
  );
  await page.getByRole("searchbox").fill("counter");
  await expect(clear).toBeEnabled();
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  await clear.click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await expect(clear).toBeDisabled();
  await category.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(category).toBeFocused();
});

test("reduced motion keeps controls immediate and touch navigation works", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4322",
    reducedMotion: "reduce",
    viewport: { width: 320, height: 600 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto("/experiments");
  await expect(page.getByRole("combobox", { name: "Category" })).toContainText(
    "All categories",
  );
  await page.getByRole("searchbox").fill("counter");
  await expect(page.getByRole("status")).toHaveText("1 experiment");
  expect(
    await page.getByRole("status").evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  await page.getByRole("button", { name: "Dark mode", exact: true }).tap();
  expect(
    await page
      .locator("#mode-toggle")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await page.getByRole("combobox", { name: "Category" }).tap();
  await expect(page.getByRole("listbox")).toBeVisible();
  expect(
    await page.getByRole("listbox").evaluate((el) => el.getAnimations().length),
  ).toBe(0);
  await page.keyboard.press("Escape");
  await page.locator('.listing-card[href="/experiments/counter"]').tap();
  await expect(page).toHaveURL(/\/experiments\/counter\/?$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await context.close();
});
