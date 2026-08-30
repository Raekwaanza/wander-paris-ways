import { expect, test } from "@playwright/test";
import { disableExternalMapRequests, planOperaToPlaceDesVosges } from "./helpers";

test.beforeEach(async ({ page }) => {
  await disableExternalMapRequests(page);
});

test("plans a deterministic provider-backed route through the real user flow", async ({ page }) => {
  await planOperaToPlaceDesVosges(page);

  const scenic = page.getByRole("button", { name: /^Scenic\b/ });
  await scenic.click();

  await expect(scenic).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Deterministic Scenic Route E2E fixture")).toBeVisible();
  await expect(page.getByRole("button", { name: "Take Scenic Route" })).toBeEnabled();
});

test("switches between all three route profiles and their route-facing state", async ({ page }) => {
  await planOperaToPlaceDesVosges(page);

  const fastest = page.getByRole("button", { name: /^Fastest\b/ });
  const scenic = page.getByRole("button", { name: /^Scenic\b/ });
  const explorer = page.getByRole("button", { name: /^Explorer\b/ });

  await fastest.click();
  await expect(fastest).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("direct pedestrian route used as the baseline", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Take Fastest Route" })).toBeVisible();

  await scenic.click();
  await expect(scenic).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Chosen from real walking alternatives", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Take Scenic Route" })).toBeVisible();

  await explorer.click();
  await expect(explorer).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("A discovery-focused walking alternative selected", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Take Explorer Route" })).toBeVisible();
});

test("opens and dismisses a discovery detail", async ({ page }) => {
  await planOperaToPlaceDesVosges(page);
  await page.getByRole("button", { name: /^Scenic\b/ }).click();

  const discoveryButton = page.getByRole("button", { name: /^View details for / }).first();
  const accessibleName = await discoveryButton.getAttribute("aria-label");
  expect(accessibleName).toMatch(/^View details for .+/);
  const discoveryName = accessibleName!.replace("View details for ", "");
  await discoveryButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: discoveryName })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("starts navigation for a provider-backed route", async ({ page }) => {
  await planOperaToPlaceDesVosges(page);
  await page.getByRole("button", { name: /^Scenic\b/ }).click();
  await page.getByRole("button", { name: "Take Scenic Route" }).click();

  await expect(page).toHaveURL(/\/navigate\?profile=scenic$/);
  await expect(page.getByText(/Walking route .* Scenic .* Place des Vosges/)).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole("button", { name: "Finish route" })).toBeVisible();
});

test("recovers when planning is entered without required trip state", async ({ page }) => {
  await page.goto("/plan");

  await expect(
    page.getByRole("heading", { name: "We need your route details again" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to planner" }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { name: "Where are you going?" })).toBeVisible();
});
