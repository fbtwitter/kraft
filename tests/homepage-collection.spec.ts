import { expect, test } from "@playwright/test";

test("homepage collection fits one screen and links to the full collection", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [320, 568],
    [320, 480],
    [568, 320],
    [844, 390],
    [801, 600],
    [900, 600],
    [390, 844],
    [768, 1024],
    [1024, 600],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const section = page.locator(".catalog-section");
    await expect(section.locator(".experiment-card:visible")).toHaveCount(
      width <= 900 || height <= 500 ? 1 : 3,
    );
    const metrics = await section.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      available:
        innerHeight -
        document.querySelector(".hdr")!.getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > innerWidth,
    }));
    expect(metrics.height).toBeLessThanOrEqual(metrics.available + 1);
    expect(metrics.overflow).toBe(false);
    await section.locator(".collection-link").click();
    await expect(page).toHaveURL(/\/experiments\/?$/);
    await expect(
      page.locator('.listing-card[href="/experiments/counter"]'),
    ).toBeVisible();
  }
});
