import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const output = "public/experiments/previews";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 640, height: 400 },
    reducedMotion: "reduce",
  });
  for (const slug of [
    "counter",
    "qr-code-card",
    "iframe-sign-in-embed",
    "story-player",
  ]) {
    await page.goto(
      `http://127.0.0.1:4322/experiments/${slug}${slug === "story-player" ? "" : "/island"}`,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.locator("astro-island[ssr]").waitFor({ state: "detached" });
    if (slug === "story-player") {
      await page.addStyleTag({ content: ".hdr { visibility: hidden; }" });
      await page
        .frameLocator("iframe")
        .getByText("Slide 1 of 8 · Paused", { exact: true })
        .waitFor();
      await page
        .frameLocator("iframe")
        .locator('[aria-label="Story player"] > div')
        .first()
        .screenshot({ path: `${output}/${slug}.png` });
    } else {
      await page.screenshot({ path: `${output}/${slug}.png` });
    }
  }
} finally {
  await browser.close();
}
