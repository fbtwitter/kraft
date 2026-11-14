import { expect, test } from "@playwright/test";

test("five categories group the collection and preserve filtering", async ({
  page,
}) => {
  await page.goto("/experiments");
  const category = page.locator('button[role="combobox"]');
  await expect(category).toContainText("All categories");
  await expect(page.locator(".category-group:visible")).toHaveCount(5);
  await expect(page.locator(".listing-card:visible")).toHaveCount(22);
  await category.click();
  await expect(page.getByRole("option")).toHaveCount(6);
  await page
    .getByRole("option", { name: "Lists & planning", exact: true })
    .click();
  await expect(page.locator(".listing-card:visible")).toHaveCount(3);
  await expect(page.locator(".category-group:visible")).toHaveCount(1);
  await page.reload();
  await expect(category).toContainText("Lists & planning");
  await page.getByRole("searchbox").fill("no-such-pattern");
  await expect(page.locator("#experiment-empty")).toBeVisible();
  await expect(page.locator(".category-group:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(category).toContainText("All categories");
  await expect(page.locator(".listing-card:visible")).toHaveCount(22);
  await page.goto("/experiments?topic=forms");
  await expect(category).toContainText("Forms & input");
});

test("work-derived checklist, ordering, date boundaries and save recovery", async ({
  page,
}) => {
  await page.goto("/experiments/task-checklist");
  await page.getByRole("checkbox").first().check();
  await expect(page.getByRole("status")).toContainText("1 of 3");
  await page.getByLabel("New step").fill("Share the result");
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1 of 4");
  await page.getByRole("button", { name: "Remove Share the result" }).click();
  await expect(page.getByRole("status")).toContainText("1 of 3");
  await page.goto("/experiments/list-reordering");
  await page
    .getByRole("button", { name: "Move Prototype up", exact: true })
    .click();
  await expect(page.locator(".work-list > li").first()).toContainText(
    "Prototype",
  );
  await page
    .locator(".work-list > li")
    .first()
    .dragTo(page.locator(".work-list > li").last());
  await expect(page.locator(".work-list > li").last()).toContainText(
    "Prototype",
  );
  await page.goto("/experiments/date-presets");
  await page.getByLabel("Reference date").fill("2026-11-15");
  await page.getByRole("button", { name: "This weekend", exact: true }).click();
  await expect(page.getByLabel("Due date")).toHaveValue("2026-11-21");
  await page.getByLabel("Reference date").fill("2026-11-16");
  await page.getByRole("button", { name: "Next week", exact: true }).click();
  await expect(page.getByLabel("Due date")).toHaveValue("2026-11-23");
  await page.getByLabel("Reference date").fill("2026-12-31");
  await page.getByRole("button", { name: "Tomorrow", exact: true }).click();
  await expect(page.getByLabel("Due date")).toHaveValue("2027-01-01");
  await page.goto("/experiments/debounced-save");
  await page
    .getByRole("textbox", { name: "Draft", exact: true })
    .fill("Keep this draft");
  await expect(page.getByRole("status")).toHaveText("Saved in demo memory");
  await page.getByLabel("Simulate failed save").check();
  await page
    .getByRole("textbox", { name: "Draft", exact: true })
    .fill("Recover this draft");
  await expect(page.getByRole("status")).toContainText("Save failed");
  await expect(
    page.getByRole("textbox", { name: "Draft", exact: true }),
  ).toHaveValue("Recover this draft");
  await page.getByLabel("Simulate failed save").uncheck();
  await page.getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved in demo memory");
  await expect(page.locator(".pattern-state")).toContainText(
    "Recover this draft",
  );
});

test("command palette keyboard filtering, no results and focus return", async ({
  page,
}) => {
  await page.goto("/experiments/command-palette");
  await page
    .getByRole("button", { name: "Open command palette", exact: true })
    .click();
  await page.getByRole("combobox").fill("note");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Selected: Create a note");
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox").fill("zzzz");
  await expect(
    page.getByText("No matching actions. Try another word."),
  ).toBeVisible();
  await page.getByRole("combobox").fill("");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Selected: Create a note");
  await page.keyboard.press("Control+k");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open command palette", exact: true }),
  ).toBeFocused();
});

test("new experiments fit mobile and desktop", async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of [
      "task-checklist",
      "list-reordering",
      "date-presets",
      "debounced-save",
      "command-palette",
    ]) {
      await page.goto(`/experiments/${slug}`);
      await expect(page.locator(".pattern-demo").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.goto("/experiments");
    await expect(page.locator('button[role="combobox"]')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "test-results/categories-desktop.png" });
});
