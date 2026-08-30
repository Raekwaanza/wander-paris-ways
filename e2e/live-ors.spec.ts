import { expect, test } from "@playwright/test";
import { disableExternalMapRequests, planOperaToPlaceDesVosges } from "./helpers";

test("routes through live ORS and enters navigation with provider geometry", async ({ page }) => {
  await disableExternalMapRequests(page);
  await planOperaToPlaceDesVosges(page);

  const fastest = page.getByRole("button", { name: /^Fastest\b/ });
  await fastest.click();

  await expect(fastest).toHaveAttribute("aria-pressed", "true");
  await expect(fastest).toContainText(/[1-9]\d* min/);
  await expect(fastest).toContainText(/(?:[1-9]\d*(?:\.\d+)?|0\.[1-9]\d*) km/);
  await expect(page.getByText(/openrouteservice/i)).toBeVisible();
  await expect(page.getByText("Deterministic Scenic Route E2E fixture")).toHaveCount(0);

  const navigationCta = page.getByRole("button", { name: "Take Fastest Route" });
  await expect(navigationCta).toBeEnabled();
  await navigationCta.click();

  await expect(page).toHaveURL(/\/navigate\?profile=fastest$/);
  await expect(page.getByText(/Walking route .* Fastest .* Place des Vosges/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Finish route" })).toBeVisible();
});
