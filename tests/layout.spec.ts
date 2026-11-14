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
  await page
    .getByRole("button", { name: "Increase count", exact: true })
    .click();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "all experiments", exact: true })
    .click();
  await expect(page).toHaveURL(/\/experiments\/?$/);
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});

test("hero reshuffles on refresh and responds to pointer gravity", async ({
  page,
}) => {
  await page.goto("/");
  const fragments = page.locator(".code-fragment");
  await expect
    .poll(() =>
      fragments.first().evaluate((el) => el.style.getPropertyValue("--pull-x")),
    )
    .not.toBe("");
  const before = await fragments.evaluateAll((nodes) =>
    nodes
      .map((el) => `${el.textContent}:${el.getAttribute("style")}`)
      .join("|"),
  );
  await page.reload();
  await expect
    .poll(() =>
      fragments.first().evaluate((el) => el.style.getPropertyValue("--pull-x")),
    )
    .not.toBe("");
  expect(
    await fragments.evaluateAll((nodes) =>
      nodes
        .map((el) => `${el.textContent}:${el.getAttribute("style")}`)
        .join("|"),
    ),
  ).not.toBe(before);
  await page.mouse.move(300, 250);
  await expect
    .poll(() =>
      fragments.evaluateAll((nodes) =>
        nodes.some(
          (el) =>
            Math.abs(
              parseFloat(
                (el as HTMLElement).style.getPropertyValue("--pull-x"),
              ),
            ) > 0.1,
        ),
      ),
    )
    .toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(fragments.first()).not.toHaveCSS(
    "animation-name",
    "fragment-drift",
  );
  expect(
    await fragments
      .first()
      .evaluate((el) => el.style.getPropertyValue("--pull-x")),
  ).toBe("0px");
});

test("collection categories restore legacy URL state and reset", async ({
  page,
}) => {
  await page.goto("/experiments?topic=forms");
  const topic = page.locator('button[role="combobox"][aria-label="Category"]');
  await expect(topic).toContainText("Forms & input");
  await topic.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(topic).toBeFocused();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(topic).toContainText("All categories");
  await page.getByRole("searchbox").fill("counter");
  await expect(page.locator(".listing-card:visible")).toHaveCount(1);
});
