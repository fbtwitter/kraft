import { expect, test } from "@playwright/test";

test("fresh and invalid preferences default dark in both page types", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  for (const saved of [null, "invalid"]) {
    await page.addInitScript((value) => {
      value === null
        ? localStorage.removeItem("kraft-mode")
        : localStorage.setItem("kraft-mode", value);
    }, saved);
    for (const route of ["/experiments", "/experiments/counter/island"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    }
  }
});

test("saved light applies in the head and the toggle survives client navigation", async ({
  page,
}) => {
  await page.goto("/experiments");
  await page.evaluate(() => localStorage.setItem("kraft-mode", "light"));
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      Object.assign(window, {
        appearanceAtBody: document.documentElement.dataset.mode,
      });
      observer.disconnect();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.reload();
  expect(
    await page.evaluate(() => Reflect.get(window, "appearanceAtBody")),
  ).toBe("light");
  const toggle = page.getByRole("button", { name: "Dark mode", exact: true });
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#icon-moon")).toBeVisible();
  await expect(page.locator("#icon-sun")).toBeHidden();
  await page.evaluate(() => {
    Object.assign(window, { appearanceNavigationCheck: "same-document" });
  });
  for (let i = 0; i < 3; i++) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    await page.locator('.listing-card[href="/experiments/counter"]').click();
    await expect(page).toHaveURL(/\/experiments\/counter\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
    expect(
      await page.evaluate(() =>
        Reflect.get(window, "appearanceNavigationCheck"),
      ),
    ).toBe("same-document");
    await toggle.click();
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
    await expect(toggle).toHaveAttribute("title", "Dark mode is off");
    await page
      .getByRole("link", { name: "all experiments", exact: true })
      .click();
    await expect(page).toHaveURL(/\/experiments\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  }
  await page.goto("/experiments/counter/island");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
});

test("unavailable storage allows toggling and preserves choice during client navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage denied", "SecurityError");
      },
    });
  });
  await page.goto("/experiments");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await page.locator('.listing-card[href="/experiments/counter"]').click();
  await expect(page).toHaveURL(/\/experiments\/counter\/?$/);
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await page.goto("/experiments/counter/island");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  expect(errors).toEqual([]);
});

test("write failures keep the current choice instead of re-reading the old preference", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("kraft-mode", "light");
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.goto("/experiments");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "light");
  await page.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
  await page.locator('.listing-card[href="/experiments/counter"]').click();
  await expect(page).toHaveURL(/\/experiments\/counter\/?$/);
  await expect(page.locator("html")).toHaveAttribute("data-mode", "dark");
});
