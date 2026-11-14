import { expect, test } from "@playwright/test";

test("chart ranges, keyboard inspection, pointer inspection and state recovery", async ({
  page,
}) => {
  await page.goto("/experiments/time-series-explorer/island");
  const slider = page.getByRole("slider", { name: "Inspect date" });
  const status = page.getByRole("status");
  await expect(status).toContainText("14 Nov 2026");
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(status).toContainText("8 Nov 2026");
  await page.keyboard.press("ArrowRight");
  await expect(status).toContainText("9 Nov 2026");
  await page.keyboard.press("End");
  await expect(status).toContainText("14 Nov 2026");
  for (const [days, start] of [
    [30, "16 Oct 2026"],
    [90, "17 Aug 2026"],
  ] as const) {
    await page
      .getByRole("button", { name: `${days} days`, exact: true })
      .click();
    await expect(slider).toHaveAttribute("max", String(days - 1));
    await slider.focus();
    await page.keyboard.press("Home");
    await expect(status).toContainText(start);
  }
  const chart = page.getByRole("img", {
    name: "90-day sample buy and sell price chart",
  });
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.975, box.y + box.height / 2);
  await expect(status).toContainText("14 Nov 2026");
  await expect(status).toContainText("Rp 1.237.440");
  for (const [option, message] of [
    ["Loading prices", "Loading prices…"],
    ["No prices", "No prices for this range"],
  ]) {
    await page.getByRole("combobox", { name: "Scenario" }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
    await expect(status).toContainText(message);
    await expect(slider).toHaveCount(0);
    await page.getByRole("button", { name: "Load sample prices" }).click();
    await expect(slider).toBeVisible();
  }
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/time-series-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/time-series-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(slider).toHaveAttribute("max", "6");
  await expect(slider).toHaveValue("6");
});

test("chart supports tapping a sample date", async ({ browser }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 390, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(
    "http://127.0.0.1:4322/experiments/time-series-explorer/island",
  );
  const box = (await page.getByRole("img").boundingBox())!;
  await page.touchscreen.tap(
    box.x + box.width * (104 / 640),
    box.y + box.height / 2,
  );
  await expect(page.getByRole("status")).toContainText("8 Nov 2026");
  await context.close();
});
