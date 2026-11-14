import { expect, test } from "@playwright/test";

test("active navigation follows client navigation between home and Experiments", async ({
  page,
}) => {
  await page.goto("/");
  const experiments = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Experiments", exact: true });
  await expect(experiments).not.toHaveAttribute("aria-current");
  await experiments.click();
  await expect(page).toHaveURL(/\/experiments\/?$/);
  await expect(experiments).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "kraft", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(experiments).not.toHaveAttribute("aria-current");
});

test("shell navigation, collection headings and related experiments", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const featuredTitle = await page.locator("#featured-title").textContent();
  expect(featuredTitle?.trim()).toBe("Grouped Activity History");
  await page.goto("/experiments");
  const collectionLink = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Experiments" });
  await expect(collectionLink).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".listing-card h2")).toHaveCount(0);
  expect(await page.locator(".listing-card h3").count()).toBeGreaterThan(3);
  await page.goto("/experiments/activity-history");
  const related = page.getByRole("region", {
    name: "More in Lists & planning",
  });
  await expect(related.getByRole("link")).toHaveCount(2);
  const destinations = await related
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(destinations).not.toContain("/experiments/activity-history");
  await related.getByRole("link").first().click();
  await expect(page).toHaveURL(destinations[0]!);
  await expect(page.locator(".hdr-nav a[aria-current=page]")).toHaveText(
    "Experiments",
  );
});

test("hero motion pauses offscreen and follows live motion preferences", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".lab-hero");
  const fragment = page.locator(".code-fragment").first();
  await expect(hero).not.toHaveAttribute("data-motion-paused");
  await page.mouse.move(300, 250);
  await expect
    .poll(() =>
      fragment.evaluate((el) => el.style.getPropertyValue("--pull-x")),
    )
    .not.toBe("");
  await page.locator(".catalog-section").scrollIntoViewIfNeeded();
  await expect(hero).toHaveAttribute("data-motion-paused");
  const position = await fragment.getAttribute("style");
  await page.waitForTimeout(100);
  await expect(fragment).toHaveAttribute("style", position!);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(hero).not.toHaveAttribute("data-motion-paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).toHaveAttribute("data-motion-paused");
  await expect
    .poll(() =>
      fragment.evaluate((el) => el.style.getPropertyValue("--pull-x")),
    )
    .toBe("0px");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(hero).not.toHaveAttribute("data-motion-paused");
  await page.goto("/experiments");
  await page.getByRole("link", { name: "kraft", exact: true }).first().click();
  await expect(hero).not.toHaveAttribute("data-motion-paused");
});
