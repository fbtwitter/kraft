import { expect, test } from "@playwright/test";

test("all experiment layouts fit both themes, small screens and standalone views", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/experiments");
  const routes = await page
    .locator(".listing-card")
    .evaluateAll((cards) => cards.map((card) => card.getAttribute("href")!));
  expect(routes).toContain("/experiments/counter");
  for (const mode of ["light", "dark"]) {
    await page.evaluate(
      (value) => localStorage.setItem("kraft-mode", value),
      mode,
    );
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await page.goto(route);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} ${mode} ${width}`,
        ).toBe(true);
      }
    }
  }
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of routes) {
    await page.goto(`${route}/island`);
    await expect(page.locator("astro-island, iframe").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} standalone`,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("polished controls retain their interactive states", async ({ page }) => {
  await page.goto("/experiments/counter");
  await page.getByRole("button", { name: "Increase count" }).click();
  await expect(page.getByLabel("Current count")).toHaveText("1");
  await page.getByRole("button", { name: "Decrease count" }).click();
  await expect(page.getByLabel("Current count")).toHaveText("0");
  await page.goto("/experiments/code-verification");
  await page.getByRole("textbox", { name: "Verification code" }).fill("123456");
  await page.getByRole("button", { name: "Verify code" }).click();
  await expect(page.locator("#verification-status")).toHaveText(
    "Code verified.",
  );
  await page.goto("/experiments/pin-entry");
  await page.getByLabel("Four-digit PIN", { exact: true }).fill("2468");
  await page.getByRole("button", { name: "Check PIN" }).click();
  await expect(page.locator("#demo-pin-status")).toHaveText("PIN accepted.");
  await page.goto("/experiments/drawer-navigation");
  await page.getByRole("button", { name: "Open panel" }).click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: "Save and close" }).click();
  await expect(page.getByRole("status")).toContainText("Preferences saved");
  await page.goto("/experiments/toast-feedback");
  await page.getByRole("button", { name: "Error", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("That did not work");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.goto("/experiments/browser-notifications");
  await page
    .getByRole("button", { name: "Preview without permission" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A small reminder" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss preview" }).click();
  await page.goto("/experiments/iframe-sign-in-embed");
  await page
    .getByRole("button", { name: "direct sign-in example", exact: true })
    .click();
  await expect(page.locator('iframe[title="embed target"]')).toHaveAttribute(
    "src",
    "/labs/direct-sign-in",
  );
});

test("remaining demo flows survive the visual polish", async ({
  page,
  context,
}) => {
  test.setTimeout(45000);
  await page.goto("/experiments/async-states");
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.getByRole("status")).toContainText("Loaded");
  await page.goto("/experiments/connection-recovery");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connected");
  await page.goto("/experiments/confirmation-flow");
  await page.getByRole("textbox").fill("Polished item");
  await page.getByRole("button", { name: "Review change" }).click();
  await page.getByRole("button", { name: "Confirm change" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Saved value: Polished item",
  );
  await page.goto("/experiments/skeleton-loading");
  await page.getByRole("button", { name: "Load preview" }).click();
  await expect(page.getByRole("status")).toHaveText("Sample content loaded.");
  await page.goto("/experiments/feature-variations");
  await page.getByRole("checkbox").uncheck();
  await expect(page.getByRole("status")).toHaveText(
    "Showing default list fallback.",
  );
  await page.goto("/experiments/guided-tour");
  await page.getByRole("button", { name: "Start tour" }).click();
  await expect(page.locator(".driver-popover")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/experiments/qr-reader");
  await page
    .locator("input[type=file]")
    .setInputFiles("public/experiments/previews/qr-code-card.png");
  await expect(page.getByRole("status")).toHaveText("QR code decoded locally.");
  await page.goto("/experiments/story-player");
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await frame.getByRole("button", { name: "Pause", exact: true }).click();
  await frame.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(
    frame.getByText("Slide 2 of 8 · Paused", { exact: true }),
  ).toBeVisible();
  await page.goto("/labs/offline-notes/");
  await page.locator("#note").fill("Polished and available offline");
  await page.getByRole("button", { name: "Enable offline mode" }).click();
  await expect(page.locator("#offline")).toContainText("Offline mode ready");
  await page.reload();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#note")).toHaveValue(
    "Polished and available offline",
  );
  await context.setOffline(false);
});

test("opened palettes, confirmations, drawers and selects fit their viewport", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [
    { width: 320, height: 600 },
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    for (const slug of ["command-palette", "confirmation-flow"]) {
      await page.goto(`/experiments/${slug}`);
      await page
        .getByRole("button", {
          name:
            slug === "command-palette"
              ? "Open command palette"
              : "Review change",
          exact: true,
        })
        .click();
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();
      const bounds = await modal.boundingBox();
      const availableWidth = await page.evaluate(
        () => document.documentElement.getBoundingClientRect().width,
      );
      expect(
        Math.abs(bounds!.x + bounds!.width / 2 - availableWidth / 2),
      ).toBeLessThan(2);
      expect(
        Math.abs(bounds!.y + bounds!.height / 2 - viewport.height / 2),
      ).toBeLessThan(2);
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press("Escape");
    }
    await page.goto("/experiments/drawer-navigation");
    for (const preset of ["Side drawer", "Bottom sheet"]) {
      await page.locator("button[role=combobox]").click();
      await page.getByRole("option", { name: preset, exact: true }).click();
      await page.getByRole("button", { name: "Open panel" }).click();
      const box = await page.getByRole("dialog").boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
      await page.keyboard.press("Escape");
    }
    for (const slug of [
      "code-verification",
      "guided-tour",
      "async-states",
      "skeleton-loading",
      "feature-variations",
      "story-player",
    ]) {
      await page.goto(`/experiments/${slug}`);
      await page.locator("button[role=combobox]").click();
      const menu = page.getByRole("listbox");
      await expect(menu).toBeVisible();
      const box = await menu.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
      await page.keyboard.press("Escape");
    }
  }
});
