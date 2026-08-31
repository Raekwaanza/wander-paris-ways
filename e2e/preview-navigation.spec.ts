import { expect, test } from "@playwright/test";
import { disableExternalMapRequests, planOperaToPlaceDesVosges } from "./helpers";

test.beforeEach(async ({ page }) => {
  await disableExternalMapRequests(page);
});

test("keeps credential-free preview geometry out of navigation", async ({ page }) => {
  await planOperaToPlaceDesVosges(page);
  await page.getByRole("button", { name: /^Scenic\b/ }).click();

  const navigationCta = page.getByRole("button", { name: "Preview only" });
  await expect(navigationCta).toBeDisabled();
  await expect(
    page.getByText("This option is currently available only as a preview."),
  ).toBeVisible();

  await page.goto("/navigate?profile=scenic");
  await expect(page.getByRole("heading", { name: "This route is preview-only" })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("link", { name: "Back to routes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Walking direction" })).toHaveCount(0);
});
