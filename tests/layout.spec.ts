import { expect, test } from "@playwright/test";

test("lab layout fits narrow screens and theme survives experiment navigation", async ({
  page,
}) => {
  for (const mode of ["dark", "light"]) {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      if ((await page.locator("html").getAttribute("data-mode")) !== mode) {
        await page
          .getByRole("button", { name: "Dark mode", exact: true })
          .click();
      }
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      for (const route of [
        "/",
        "/experiments/counter",
        "/experiments/iframe-sign-in-embed",
        "/experiments/qr-code-card",
        "/experiments/story-player",
      ]) {
        await page.goto(route);
        await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(
          page
            .getByRole("navigation", { name: "Main navigation" })
            .getByRole("link", { name: "Experiments", exact: true }),
        ).toBeVisible();
      }
    }
  }
  await page.goto("/experiments/counter");
  await page.getByRole("button", { name: "+", exact: true }).click();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "all experiments", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});
