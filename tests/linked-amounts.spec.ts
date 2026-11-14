import { expect, test } from "@playwright/test";

test("linked amounts preserve the edited field and apply rounding and limits", async ({
  page,
}) => {
  await page.goto("/experiments/linked-amounts/island");
  await page.locator("astro-island[ssr]").waitFor({ state: "detached" });
  const rupiah = page.getByLabel("Rupiah (IDR)");
  const gold = page.getByLabel("Gold (grams)");
  const status = page.getByRole("status");
  await gold.fill("0,0001");
  await expect(rupiah).toHaveValue("124");
  await page.getByRole("button", { name: "Sell gold", exact: true }).click();
  await expect(gold).toHaveValue("0,0001");
  await expect(rupiah).toHaveValue("120");
  await page.getByRole("button", { name: "Sell all", exact: true }).click();
  await expect(gold).toHaveValue("0,4321");
  await gold.fill("0.4322");
  await expect(status).toContainText("exceeds the sample gold balance");
  await gold.fill("0.00001");
  await expect(status).toContainText("up to four decimal places");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await rupiah.fill("250001");
  await expect(status).toContainText("exceeds the sample wallet balance");
  await page.getByRole("button", { name: "Use maximum", exact: true }).click();
  await expect(gold).toHaveValue("0,2025");
  await expect(rupiah).toHaveValue("250000");
  await rupiah.fill("");
  await expect(gold).toHaveValue("");
  await expect(status).toContainText("Enter an amount");
  await rupiah.fill("1");
  await expect(status).toContainText("minimum quantity");
  await rupiah.fill("abc");
  await expect(status).toContainText("Use whole rupiah");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
