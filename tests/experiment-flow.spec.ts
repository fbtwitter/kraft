import { expect, test } from "@playwright/test";

test("discover an experiment, control playback, and inspect its messages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".idx-row img")).toHaveCount(4);
  await page
    .locator(".idx-row img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Story Player/ }).click();
  await expect(
    page.getByRole("link", { name: "Open standalone" }),
  ).toHaveAttribute("href", "/labs/story-player-child");
  const frame = page.frameLocator(
    'iframe[title="story player (embedded via iframe)"]',
  );
  await expect(frame.getByText("Slide 1 of 8", { exact: false })).toBeVisible();
  await frame.getByRole("button", { name: "Pause", exact: true }).click();
  await frame.getByRole("button", { name: "Next slide" }).click();
  await expect(
    frame.getByText("Slide 2 of 8 · Paused", { exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(
    frame.getByText("Slide 3 of 8 · Playing", { exact: true }),
  ).toBeVisible({ timeout: 7000 });
  await frame.getByRole("button", { name: "Pause", exact: true }).click();
  await frame.getByRole("button", { name: "Previous slide" }).click();
  await page.waitForTimeout(5500);
  await expect(
    frame.getByText("Slide 2 of 8 · Paused", { exact: true }),
  ).toBeVisible();
  await frame
    .getByRole("region", { name: "Story player", exact: true })
    .focus();
  await page.keyboard.press("ArrowLeft");
  await expect(
    frame.getByText("Slide 1 of 8 · Paused", { exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Replay" }).click();
  await expect(
    frame.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await choose(page, "layouts");
  await expect(frame.getByText("Slide 1 of 3", { exact: false })).toBeVisible();
  await frame.getByRole("button", { name: "Pause", exact: true }).click();
  await frame.getByRole("button", { name: "Next slide" }).click();
  await expect(frame.getByText("1,284", { exact: true })).toBeVisible();
  const inspector = page.locator("details");
  await expect(inspector).not.toHaveAttribute("open");
  await page.getByText("Inspect messages", { exact: true }).click();
  await expect(inspector).toHaveAttribute("open", "");
  await expect(
    inspector.getByText("→ INIT (custom slides)", { exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Close", exact: true }).click();
  await expect(frame.getByText("player closed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await expect(frame.getByText("Slide 1 of 3", { exact: false })).toBeVisible();
});

test("mobile player fits its frame and standalone respects reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/experiments/story-player");
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByText("Slide 1 of 8 · Paused", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/story-mobile.png",
    fullPage: true,
  });
  expect(
    await frame
      .locator("html")
      .evaluate(
        (element) =>
          element.scrollWidth <= innerWidth &&
          element.scrollHeight <= innerHeight,
      ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await frame
      .locator("html")
      .evaluate(
        (element) =>
          element.scrollWidth <= innerWidth &&
          element.scrollHeight <= innerHeight,
      ),
  ).toBe(true);
  await page.goto("/labs/story-player-child");
  await expect(
    page.getByText("Slide 1 of 5 · Paused", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("details")).not.toHaveAttribute("open");
});

test("media preset shares images and lets the host open links", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route("https://example.com/", (route) =>
    route.fulfill({ body: "Sample insight page" }),
  );
  await page.goto("/experiments/story-player");
  await choose(page, "media");
  const frame = page.frameLocator("iframe");
  await expect(frame.getByText("Slide 1 of 3", { exact: false })).toBeVisible();
  await frame.getByRole("button", { name: "Pause", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await frame
    .getByRole("button", { name: "Share current slide as image" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("story-slide-1.png");
  expect(await download.failure()).toBeNull();
  await frame.getByRole("button", { name: "Next slide" }).click();
  await expect(
    frame.getByText("Slide 2 of 3 · Paused", { exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Next slide" }).click();
  await expect(
    frame.getByText("Slide 3 of 3 · Paused", { exact: true }),
  ).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await frame.getByRole("link", { name: "Lihat Insight Lengkap" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://example.com/");
  expect(errors).toEqual([]);
});

async function choose(page: import("@playwright/test").Page, value: string) {
  await page.getByRole("combobox").click();
  await page.locator(`[role="option"][data-value="${value}"]`).click();
}