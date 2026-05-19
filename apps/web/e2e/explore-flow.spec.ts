import { expect, test } from "@playwright/test";

test("explore URL state restores current list filters", async ({ page }) => {
  await page.goto(
    "/explore?view=list&q=anilao&difficulty=easy&verifiedOnly=true&bounds=14.00000,121.00000,13.00000,120.00000",
  );

  await expect(
    page.getByText("Find dive spots around the Philippines"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Verified only/i }),
  ).toBeVisible();

  const url = new URL(page.url());
  expect(url.searchParams.get("view")).toBe("list");
  expect(url.searchParams.get("q")).toBe("anilao");
  expect(url.searchParams.get("difficulty")).toBe("easy");
  expect(url.searchParams.get("verifiedOnly")).toBe("true");
  expect(url.searchParams.get("bounds")).toBe(
    "14.00000,121.00000,13.00000,120.00000",
  );

  await page.getByRole("button", { name: /Map/i }).click();
  await expect(page.getByRole("button", { name: /List/i })).toBeVisible();

  await page.reload();
  const reloadedUrl = new URL(page.url());
  expect(reloadedUrl.searchParams.get("view")).toBe("map");
});
