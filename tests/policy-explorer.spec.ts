import { expect, test } from "@playwright/test";

test("policy explorer supports disclosure, documents, empty states and recovery", async ({
  page,
}) => {
  await page.goto("/experiments/policy-explorer/island");
  await expect(page.getByRole("status")).toHaveText("2 active policies");
  const first = page
    .locator("details")
    .filter({ hasText: "Everyday accident cover" });
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("open", "");
  await first.getByRole("button", { name: "Preview document" }).click();
  await expect(
    page.getByRole("region", { name: "Everyday accident cover document" }),
  ).toContainText("SAMPLE DOCUMENT");
  await first.getByRole("button", { name: "Hide document" }).click();
  await expect(page.getByRole("region")).toHaveCount(0);
  await expect(first).toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator("details[open]")).toHaveCount(0);
  await page.getByRole("button", { name: "Expired (1)", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("1 expired policy");
  await expect(first).toHaveCount(0);
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Preview document" }).click();
  await expect(page.getByRole("region")).toContainText("Weekend travel cover");
  await page.getByRole("combobox", { name: "Scenario" }).click();
  await page.getByRole("option", { name: "No policies", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No expired policies" }),
  ).toBeVisible();
  await expect(page.getByRole("region")).toHaveCount(0);
  await page.getByRole("button", { name: "Load sample policies" }).click();
  await expect(page.getByRole("status")).toHaveText("1 expired policy");
  await page.getByRole("combobox", { name: "Scenario" }).click();
  await page
    .getByRole("option", { name: "Documents unavailable", exact: true })
    .click();
  await page.locator("summary").click();
  await page.getByRole("button", { name: "Preview document" }).click();
  await expect(
    page.getByRole("heading", { name: "Document unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restore sample document" }).click();
  await expect(page.getByRole("region")).toContainText("SAMPLE DOCUMENT");
  await expect(page.getByRole("region")).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/policy-explorer-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/policy-explorer-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("2 active policies");
  await expect(page.getByRole("region")).toHaveCount(0);
});
