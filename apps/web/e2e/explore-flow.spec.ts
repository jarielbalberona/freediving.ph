import { expect, test } from "@playwright/test";

test("explore URL state restores and detail opens from spotId", async ({ page }) => {
  await page.goto("/explore?view=list&search=anilao&difficulty=BEGINNER&spotId=1");
  const missingMapKey = page.getByText("Missing Google Maps API key");
  if (await missingMapKey.isVisible()) {
    test.skip(true, "Google Maps API key is required for explore runtime e2e.");
  }

  await expect(page.getByText("Explore Dive Spots")).toBeVisible();
  await expect(page.getByText("Dive Spot Details")).toBeVisible();

  const url = new URL(page.url());
  expect(url.searchParams.get("view")).toBe("list");

  await page.getByRole("button", { name: /Map/i }).click();
  await expect(page.getByRole("button", { name: /List/i })).toBeVisible();

  await page.reload();
  const reloadedUrl = new URL(page.url());
  expect(reloadedUrl.searchParams.get("view")).toBe("map");
});
