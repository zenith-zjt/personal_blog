import { expect, test, type Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/admin-archive-portal/login");
  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill("admin");
  await page
    .locator("form")
    .filter({ has: page.locator("#admin-username") })
    .getByRole("button")
    .click();
  await expect(page).toHaveURL(/\/admin-archive-portal$/);
}

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
  await page.getByRole("button").filter({ hasText: /搜索/ }).first().click();

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

test("article toc ignores code-fence headings, indents nested titles, and highlights code", async ({
  page,
}) => {
  const libraryName = `playwright-render-${Date.now()}`;

  await loginAsAdmin(page);
  await page.goto("/admin-archive-portal/tree");

  await page.locator("#library-name").fill(libraryName);
  await page
    .locator("form")
    .filter({ has: page.locator("#library-name") })
    .getByRole("button")
    .click();

  await expect(page).toHaveURL(new RegExp(`selected=${libraryName}`));

  await page.setInputFiles("#markdown-file", {
    name: "toc-playground.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      [
        "# Toc Playground",
        "",
        "## Visible Section",
        "",
        "```ts",
        "# hidden from toc",
        "const total = 42;",
        'const title = "Colorized";',
        "```",
        "",
        "### Nested Section",
        "",
        "Paragraph.",
      ].join("\n"),
      "utf8",
    ),
  });
  await page
    .locator("form")
    .filter({ has: page.locator("#markdown-file") })
    .getByRole("button", { name: "上传 Markdown 文章" })
    .click();
  await expect(page.locator("p[role='status']")).toBeVisible();

  await page.goto(`/kb/${libraryName}/toc-playground`);

  const toc = page.getByRole("navigation", { name: /On This Page|文章内导航/ });
  await expect(toc).toContainText("Visible Section");
  await expect(toc).toContainText("Nested Section");
  await expect(toc).not.toContainText("hidden from toc");

  const topLevelPadding = await toc
    .locator("a", { hasText: "Visible Section" })
    .evaluate((element) => window.getComputedStyle(element).paddingLeft);
  const nestedPadding = await toc
    .locator("a", { hasText: "Nested Section" })
    .evaluate((element) => window.getComputedStyle(element).paddingLeft);
  expect(Number.parseFloat(nestedPadding)).toBeGreaterThan(
    Number.parseFloat(topLevelPadding),
  );

  await expect(
    page.locator("pre code [data-token='keyword']", { hasText: "const" }).first(),
  ).toContainText("const");
  await expect(page.locator("pre code [data-token='number']")).toContainText("42");
  await expect(page.locator("pre code [data-token='string']")).toContainText(
    '"Colorized"',
  );
});
