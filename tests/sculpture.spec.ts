import { expect, test } from "@playwright/test";

test("Blender sculpture supports assembly, keyboard, reduced motion and return navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("kraft-sculpture")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.getByRole("button", { name: "Play motion" })).toBeVisible();
  await page.getByRole("button", { name: "Take it apart" }).click();
  await expect(
    page.getByRole("button", { name: "Bring it together" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.locator("canvas").focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Take it apart" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Play motion" }).click();
  await expect(
    page.getByRole("button", { name: "Pause motion" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try Counter", exact: true }).click();
  await page
    .getByRole("link", { name: "all experiments", exact: true })
    .click();
  await expect(page.locator("kraft-sculpture")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.getByRole("button", { name: "Play motion" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("Blender still remains available when the 3D asset cannot load", async ({
  page,
}) => {
  await page.route("**/models/kraft-sculpture.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("kraft-sculpture canvas")).toBeHidden();
  await expect(page.locator(".sculpture-poster")).toBeVisible();
  expect(
    await page
      .locator(".sculpture-poster")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Take it apart" }),
  ).toBeHidden();
});
