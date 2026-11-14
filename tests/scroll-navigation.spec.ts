import { expect, test } from "@playwright/test";

test("scroll direction, footer handoff, presets and keyboard focus", async ({
  page,
}) => {
  await page.goto("/experiments/scroll-aware-navigation/island");
  const preview = page.getByRole("region", {
    name: "Scroll navigation preview",
  });
  const status = page.getByRole("status");
  const floating = page.getByRole("button", { name: "Jump to footer" });
  await expect(floating).toBeVisible();
  const previewBounds = (await preview.boundingBox())!;
  const actionBounds = (await floating.boundingBox())!;
  expect(actionBounds.y).toBeGreaterThanOrEqual(
    previewBounds.y + previewBounds.height,
  );
  await preview.evaluate((element) => {
    element.scrollTop = 300;
  });
  await expect(status).toContainText("Header hidden");
  await preview.evaluate((element) => {
    element.scrollTop = 220;
  });
  await expect(status).toContainText("Header visible");
  await preview.evaluate((element) => {
    element.scrollTop = 400;
  });
  await expect(status).toContainText("Header hidden");
  await page.getByRole("button", { name: "Go to footer", exact: true }).focus();
  await expect(status).toContainText("Header visible");
  await preview.focus();
  await floating.click();
  await expect(floating).toHaveCount(0);
  await expect(status).toContainText("footer in view");
  await expect(page.locator(".scroll-preview-footer")).toBeFocused();
  await page.getByRole("button", { name: "Back to top", exact: true }).click();
  await expect(preview).toBeFocused();
  await expect(floating).toBeVisible();
  await page.keyboard.press("End");
  await expect(status).toContainText("footer in view");
  await page.keyboard.press("Home");
  await expect(status).toContainText("Header visible");
  await expect(floating).toBeVisible();
  await page.getByRole("combobox", { name: "Content length" }).click();
  await page.getByRole("option", { name: "Short page", exact: true }).click();
  await expect(floating).toHaveCount(0);
  await expect(status).toContainText("footer in view");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(floating).toBeVisible();
  await expect(status).toContainText("Header visible");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await preview.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/scroll-navigation-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/scroll-navigation-mobile.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".scroll-preview-header")).toHaveCSS(
    "transition-duration",
    "0s",
  );
});
