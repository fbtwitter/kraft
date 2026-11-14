import { expect, test } from "@playwright/test";
test("experiment collection is discoverable and responsive", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Experiments", exact: true })
      .click();
    await expect(page).toHaveURL(/\/experiments\/?$/);
    await expect(
      page.locator('.listing-card[href="/experiments/counter"]'),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('.listing-card[href="/experiments/counter"]').click();
    await expect(
      page.getByRole("button", { name: "Increase count", exact: true }),
    ).toBeVisible();
  }
});
test("homepage highlights the visible section using document scroll", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".lab-hero")).toHaveAttribute("data-active", "");
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 120);
  await expect(page.locator("#experiments")).toHaveAttribute("data-active", "");
  await expect(page.locator(".shell > .ftr")).toHaveCount(1);
});

test("offline mini-app saves a note and reloads without network", async ({
  page,
  context,
}) => {
  await page.goto("/labs/offline-notes/");
  await expect(
    page.getByRole("link", { name: "Back to the experiment" }),
  ).toHaveCount(0);
  await page.getByLabel("Try a note").fill("A local test note");
  await page.getByRole("button", { name: "Enable offline mode" }).click();
  await expect(page.locator("#offline")).toContainText("Offline mode ready");
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Try a note")).toHaveValue("A local test note");
  await expect(
    page.getByRole("link", { name: "Back to the experiment" }),
  ).toHaveCount(0);
  await expect(page.locator("#connection")).toContainText("offline");
  await context.setOffline(false);
});

test("guided tour presets open and close cleanly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/experiments/guided-tour");
  for (const preset of ["single", "tour", "drawer", "delayed"]) {
    await choose(page, preset);
    await page.getByRole("button", { name: "Start tour", exact: true }).click();
    await expect(page.locator(".driver-popover-title")).toHaveText(
      "Start here",
    );
    await page.keyboard.press("Escape");
    await expect(page.locator(".driver-overlay")).toHaveCount(0);
  }
});

test("QR image decoding works without requesting camera", async ({ page }) => {
  await page.goto("/experiments/qr-reader");
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      "C:/Users/User/dev-workspace/projects/kraft/public/experiments/previews/qr-code-card.png",
    );
  await expect(page.getByText("Decoded text", { exact: true })).toBeVisible();
});

test("generic verification, drawers, feedback and notification preview work", async ({
  page,
}) => {
  await page.goto("/experiments/code-verification");
  await page.getByLabel("Verification code").fill("000000");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("does not match");
  await page.getByLabel("Verification code").fill("123456");
  await page.getByRole("button", { name: "Verify code", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("verified");
  await page.goto("/experiments/drawer-navigation");
  await page.getByRole("button", { name: "Open panel" }).click();
  await page.getByRole("button", { name: "Appearance", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Preferences", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/experiments/toast-feedback");
  await page.getByRole("button", { name: "Undo action", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Sample item restored.")).toBeVisible();
  await page.goto("/experiments/browser-notifications");
  await page
    .getByRole("button", { name: "Preview without permission" })
    .click();
  await expect(page.getByText("Local simulation")).toBeVisible();
  await page.getByRole("button", { name: "Dismiss preview" }).click();
  await expect(page.getByText("Local simulation")).toHaveCount(0);
});

test("additional interaction patterns handle their main state changes", async ({
  page,
}) => {
  await page.goto("/experiments/pin-entry");

  await page.locator(".pin-field").fill("2468");
  await page.getByRole("button", { name: "Check PIN" }).click();
  await expect(page.getByRole("status")).toHaveText("PIN accepted.");
  await page.goto("/experiments/connection-recovery");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connected");
  await page.goto("/experiments/async-states");
  await page.getByRole("button", { name: "Load sample" }).click();
  await page.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByRole("status")).toHaveText("Cancelled");
  await page.goto("/experiments/confirmation-flow");
  await page.getByLabel("Item name").fill("Changed item");
  await page.getByRole("button", { name: "Review change" }).click();
  await page
    .getByRole("button", { name: "Confirm change", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Changed item");
  await page.goto("/experiments/skeleton-loading");
  await page.getByRole("button", { name: "Load preview" }).click();
  await expect(page.getByRole("status")).toHaveText("Sample content loaded.");
  await page.goto("/experiments/feature-variations");
  await choose(page, "cards");
  await expect(page.getByRole("status")).toHaveText("Showing cards variation.");
});

test("collection filters handle search, empty results, and clear", async ({
  page,
}) => {
  await page.goto("/experiments");
  const total = await page.locator(".listing-card").count();
  await page.getByLabel("Find an experiment").fill("PIN Entry");
  await expect(page.locator(".listing-card:visible")).toHaveCount(1);
  await choose(page, "Browser capabilities");
  await expect(page.locator("#experiment-empty")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.locator(".listing-card:visible")).toHaveCount(total);
});

test("every experiment fits mobile and desktop widths", async ({ page }) => {
  await page.goto("/experiments");
  const routes = await page
    .locator(".listing-card")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
    }
  }
});

test("polished failure states, reset, and keyboard dialog behavior", async ({
  page,
}) => {
  await page.goto("/experiments/connection-recovery");
  await choose(page, "fail");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await page.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Retry limit reached");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connected");
  await page.goto("/experiments/async-states");
  await choose(page, "error");
  await page.getByRole("button", { name: "Load sample" }).click();
  await expect(page.getByRole("status")).toContainText("Request failed");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Ready");
  await page.goto("/experiments/pin-entry");
  await expect(page.locator(".pin-field")).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show PIN" }).click();
  await expect(page.locator(".pin-field")).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator(".pin-field")).toHaveAttribute("type", "password");
  await page.goto("/experiments/confirmation-flow");
  const review = page.getByRole("button", { name: "Review change" });
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(review).toBeFocused();
});

async function choose(page: import("@playwright/test").Page, value: string) {
  await page.getByRole("combobox").click();
  await page.locator(`[role="option"][data-value="${value}"]`).click();
}
test("styled dropdown supports keyboard selection and Escape", async ({
  page,
}) => {
  await page.goto("/experiments/async-states");
  const trigger = page.getByRole("combobox");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.locator("[role=option][data-value=slow]")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText("Slow request");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
