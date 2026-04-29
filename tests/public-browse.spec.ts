import { expect, test } from "@playwright/test";

test("homepage shows knowledge-base collection cards", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("library-grid")).toContainText(
    "frontend-foundations",
  );
  await expect(page.getByTestId("library-grid")).toContainText("java-notes");
});

test("knowledge-base route without slug shows the first root markdown article", async ({
  page,
}) => {
  const response = await page.goto("/kb/frontend-foundations");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/kb\/frontend-foundations$/);
  await expect(page.getByText(/(overview|应付)\.md/)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("knowledge-base article page shows tree navigation and renders markdown table", async ({
  page,
}) => {
  await page.goto("/kb/frontend-foundations");

  await expect(page.getByLabel("frontend-foundations tree")).toContainText(
    "getting-started",
  );
  await expect(page.getByLabel("frontend-foundations tree")).not.toContainText(
    "resource",
  );
  await expect(page.getByLabel("frontend-foundations tree")).not.toContainText(
    ".assets",
  );
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("knowledge-base article resolves colocated assets directory images", async ({
  page,
}) => {
  const response = await page.goto(
    "/kb/frontend-foundations/getting-started/welcome",
  );

  expect(response?.status()).toBe(200);
  const articleImage = page.getByRole("img", { name: "article image" });

  await expect(articleImage).toBeVisible();
  await expect
    .poll(() =>
      articleImage.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});

test("search flow finds an article from the homepage", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("searchbox").fill("welcome");
  await page.getByRole("button").filter({ hasText: /搜|鎼/ }).first().click();

  await expect(page.getByTestId("search-results")).toContainText(
    "getting-started/welcome.md",
  );
});

test("search page shows empty state when no result is found", async ({ page }) => {
  await page.goto("/search?q=not-existing-keyword");

  await expect(page.getByRole("heading").first()).toBeVisible();
});

test("uploaded chinese filename article can be opened on the frontend", async ({
  page,
}) => {
  const response = await page.goto(
    "/kb/frontend-foundations/getting-started/%E5%BA%94%E4%BB%98",
  );

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(
    /\/kb\/frontend-foundations\/getting-started\/%E5%BA%94%E4%BB%98$/,
  );
  await expect(page.getByText("应付.md")).toBeVisible();
});
