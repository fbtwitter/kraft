import { expect, test } from "@playwright/test";

test("text reveal timing, pause/resume, replay, modes, editing and reset", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/experiments/text-reveal/island");
  await page.locator("astro-island[ssr]").waitFor({ state: "detached" });
  const text = page.getByRole("textbox", { name: "Sample text" });
  const replay = page.getByRole("button", { name: "Replay", exact: true });
  const output = page.locator(".reveal-typewriter");
  await text.fill("Hello 👋");
  await replay.click();
  await page.clock.runFor(200);
  await expect(output).toHaveText("");
  await page.clock.runFor(250);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await output.textContent();
  expect(paused!.length).toBeGreaterThan(0);
  expect(paused).not.toBe("Hello 👋");
  await page.clock.runFor(1000);
  await expect(output).toHaveText(paused!);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(1000);
  await expect(output).toHaveText("Hello 👋");
  await expect(page.getByRole("status")).toHaveText("Complete.");
  await replay.click();
  await expect(output).toHaveText("");
  await text.fill("First line\nSecond line\nThird line");
  await page.getByRole("combobox", { name: "Effect" }).click();
  await page.getByRole("option", { name: "Line reveal", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Character delay" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("slider", { name: "Line stagger" }),
  ).toBeEnabled();
  await replay.click();
  await page.clock.runFor(350);
  await expect(page.locator('.reveal-line[data-visible="true"]')).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.reveal-line[data-visible="true"]')).toHaveCount(
    1,
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.locator('.reveal-line[data-visible="true"]')).toHaveCount(
    3,
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(text).toHaveValue(
    "Start with a small idea.\nGive it room to change.\nSee what happens next.",
  );
  await expect(page.getByRole("status")).toHaveText("Ready. Replay to start.");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/text-reveal-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({
    path: "test-results/text-reveal-mobile.png",
    fullPage: true,
  });
  await text.fill("");
  await expect(replay).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText(
    "Enter some text to begin.",
  );
});

test("live reduced-motion preference cancels playback and exposes complete text", async ({
  page,
}) => {
  await page.goto("/experiments/text-reveal/island");
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("status")).toContainText("Reduced motion");
  await expect(
    page.getByRole("button", { name: "Replay", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".reveal-typewriter")).toContainText(
    "See what happens next.",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.getByRole("status")).toHaveText("Ready. Replay to start.");
});
