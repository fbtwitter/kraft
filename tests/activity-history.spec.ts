import { expect, test } from "@playwright/test";

test("activity history groups, filters, reveals receipts and recovers from empty and failed states", async ({
  page,
}) => {
  await page.goto("/experiments/activity-history/island");
  const status = page.getByRole("status");
  await expect(status).toHaveText("5 transactions across 3 dates");
  await expect(page.locator("section > h2")).toHaveText([
    "14 Nov 2026",
    "13 Nov 2026",
    "10 Nov 2026",
  ]);
  const first = page.locator("details").first();
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    first.getByRole("heading", { name: "Sample receipt" }),
  ).toBeVisible();
  await expect(first).toContainText("SAMPLE-105");
  await expect(first).toContainText("Rp 100.000");
  await page.getByRole("button", { name: "Sales", exact: true }).click();
  await expect(status).toHaveText("2 transactions across 2 dates");
  await expect(page.locator("summary")).toHaveCount(2);
  await expect(page.locator("section > h2")).toHaveText([
    "14 Nov 2026",
    "10 Nov 2026",
  ]);
  await page.getByRole("button", { name: "Purchases", exact: true }).click();
  await expect(status).toHaveText("3 transactions across 2 dates");
  const failed = page.locator("details").filter({ hasText: "SAMPLE-103" });
  await failed.locator("summary").click();
  await expect(failed).toContainText("Attempted amount");
  await expect(failed).toContainText("No money or gold moved");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/activity-history-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/activity-history-mobile.png",
    fullPage: true,
  });
  await page.getByRole("combobox", { name: "Scenario" }).click();
  await page.getByRole("option", { name: "No activity", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No purchases yet" }),
  ).toBeVisible();
  await expect(page.locator("details")).toHaveCount(0);
  await page.getByRole("button", { name: "Load sample activity" }).click();
  await expect(status).toHaveText("3 transactions across 2 dates");
  await page.getByRole("combobox", { name: "Scenario" }).click();
  await page
    .getByRole("option", { name: "History unavailable", exact: true })
    .click();
  await expect(status).toContainText("History unavailable");
  await expect(page.locator("details")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry with sample activity" })
    .click();
  await expect(status).toHaveText("3 transactions across 2 dates");
  await page.locator("summary").first().click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(status).toHaveText("5 transactions across 3 dates");
  await expect(page.locator("details[open]")).toHaveCount(0);
});
