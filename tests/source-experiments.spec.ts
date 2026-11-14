import { expect, test } from "@playwright/test";

const experiments = [
  ["linked-amounts", "Linked Amount Inputs"],
  ["policy-explorer", "Policy & Document Explorer"],
  ["time-series-explorer", "Time-series Explorer"],
  ["activity-history", "Grouped Activity History"],
  ["scroll-aware-navigation", "Scroll-aware Navigation"],
  ["text-reveal", "Text Reveal Playground"],
];

test("all six experiments are searchable and open from the collection with keyboard", async ({
  page,
}) => {
  for (const [slug, title] of experiments) {
    await page.goto("/experiments");
    await page
      .getByRole("searchbox", { name: "Find an experiment" })
      .fill(title);
    await expect(page.getByRole("status")).toHaveText("1 experiment");
    const card = page.locator(`a.listing-card[href="/experiments/${slug}"]`);
    await expect(card).toBeVisible();
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(
      page.getByRole("link", { name: "Open standalone" }),
    ).toHaveAttribute("href", `/experiments/${slug}/island`);
    const reset = page.getByRole("button", { name: "Reset", exact: true });
    await reset.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".demo-layout")).toBeVisible();
    await page
      .getByRole("link", { name: "all experiments", exact: true })
      .click();
    await expect(page).toHaveURL(/\/experiments\/?$/);
  }
});

test("all six detail and standalone layouts fit both themes at mobile and desktop sizes", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const mode of ["light", "dark"]) {
    await page.goto("/experiments");
    if ((await page.locator("html").getAttribute("data-mode")) !== mode) {
      await page
        .getByRole("button", { name: "Dark mode", exact: true })
        .click();
    }
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [slug] of experiments) {
        for (const suffix of ["", "/island"]) {
          await page.goto(`/experiments/${slug}${suffix}`);
          await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
          const demo = page.locator(".demo-layout");
          await expect(demo).toBeVisible();
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${slug}${suffix} ${mode} ${width}`,
          ).toBe(true);
          await expect(
            page.getByRole("button", { name: "Reset", exact: true }),
          ).toBeEnabled();
        }
      }
    }
  }
  expect(errors).toEqual([]);
  await page.goto("/experiments/scroll-aware-navigation/island");
  await page.screenshot({
    path: "test-results/six-experiments-scroll-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/six-experiments-scroll-mobile.png",
    fullPage: true,
  });
});
