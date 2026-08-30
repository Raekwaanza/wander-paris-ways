import { expect, type Page } from "@playwright/test";

export async function disableExternalMapRequests(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) => {
    if (route.request().url() === "https://tiles.openfreemap.org/styles/liberty") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
      });
    }
    return route.abort();
  });
}

export async function planOperaToPlaceDesVosges(page: Page) {
  await page.goto("/explore");

  const destinationDialog = page.getByRole("dialog", { name: "Destination" });
  await expect(async () => {
    await page.getByRole("button", { name: /^To\b/ }).click();
    await expect(destinationDialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await destinationDialog.getByPlaceholder(/Address, landmark/).fill("Place des Vosges");
  await destinationDialog.getByRole("button", { name: /Place des Vosges/ }).click();

  await page.getByRole("button", { name: "Architecture" }).click();
  await page.getByRole("button", { name: "Hidden Gems" }).click();
  await page.getByRole("button", { name: "Find my route" }).click();

  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("button", { name: /^Fastest\b/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /^Scenic\b/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Explorer\b/ })).toBeVisible();
}
