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

function treeNodeTestId(relativePath: string) {
  return `tree-node-${encodeURIComponent(relativePath)}`;
}

test("unauthenticated access to hidden admin route redirects to login", async ({
  page,
}) => {
  await page.goto("/admin-archive-portal");

  await expect(page).toHaveURL(/\/admin-archive-portal\/login$/);
  await expect(page.locator("#admin-username")).toBeVisible();
});

test("default admin can log in and log out", async ({ page }) => {
  await loginAsAdmin(page);

  await expect(page.getByRole("heading").first()).toBeVisible();
  await page.getByRole("button").filter({ hasText: /./ }).last().click();
  await expect(page).toHaveURL(/\/admin-archive-portal\/login$/);
});

test("invalid admin credentials show an error", async ({ page }) => {
  await page.goto("/admin-archive-portal/login");

  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill("wrong-password");
  await page
    .locator("form")
    .filter({ has: page.locator("#admin-username") })
    .getByRole("button")
    .click();

  await expect(page.locator("p[role='alert']")).toBeVisible();
});

test("tree page expands only one knowledge base at a time", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin-archive-portal/tree");

  await page
    .getByTestId("library-panel-frontend-foundations")
    .getByRole("link")
    .first()
    .click();
  await expect(page.getByTestId("library-tree-frontend-foundations")).toBeVisible();
  await expect(page.getByTestId("library-panel-java-notes")).not.toContainText(
    "intro.md",
  );

  await page.getByTestId("library-panel-java-notes").getByRole("link").click();

  await expect(page).toHaveURL(/selected=java-notes/);
  await expect(page.getByTestId("library-tree-java-notes")).toBeVisible();
  await expect(
    page.getByTestId("library-panel-frontend-foundations"),
  ).not.toContainText("overview.md");
});

test("admin can reorder root articles, upload content, and delete folder plus knowledge base", async ({
  page,
}) => {
  const uniqueId = `playwright-kb-${Date.now()}`;
  const folderName = "notes";

  await loginAsAdmin(page);
  await page.goto("/admin-archive-portal/tree");

  await page.locator("#library-name").fill(uniqueId);
  await page
    .locator("form")
    .filter({ has: page.locator("#library-name") })
    .getByRole("button")
    .click();

  await expect(page).toHaveURL(new RegExp(`selected=${uniqueId}`));
  await expect(page.getByTestId(`library-tree-${uniqueId}`)).toContainText(
    "overview.md",
  );

  await page.setInputFiles("#markdown-file", {
    name: "alpha.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Alpha\n\nroot alpha", "utf8"),
  });
  await page
    .locator("form")
    .filter({ has: page.locator("#markdown-file") })
    .getByRole("button", { name: /上传 Markdown|涓婁紶 Markdown/ })
    .click();
  await expect(page.locator("p[role='status']")).toBeVisible();

  await page.setInputFiles("#markdown-file", {
    name: "beta.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Beta\n\nroot beta", "utf8"),
  });
  await page
    .locator("form")
    .filter({ has: page.locator("#markdown-file") })
    .getByRole("button", { name: /上传 Markdown|涓婁紶 Markdown/ })
    .click();
  await expect(page.locator("p[role='status']")).toBeVisible();

  await page
    .getByTestId(treeNodeTestId(`${uniqueId}/overview.md`))
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(
    new RegExp(`selected=${encodeURIComponent(`${uniqueId}/overview.md`)}`),
  );
  await page.getByTestId("move-selected-down").click();
  await expect(page).toHaveURL(/status=success/);

  await page.goto(`/kb/${uniqueId}`);
  await expect(page.getByRole("heading", { name: "Alpha" })).toBeVisible();

  await page.goto(
    `/admin-archive-portal/tree?selected=${encodeURIComponent(uniqueId)}&kind=library`,
  );
  await page.locator("#directory-name").fill(folderName);
  await page
    .locator("form")
    .filter({ has: page.locator("#directory-name") })
    .getByRole("button")
    .click();

  await expect(page).toHaveURL(
    new RegExp(`selected=${encodeURIComponent(`${uniqueId}/${folderName}`)}`),
  );
  await expect(page.getByTestId(`library-tree-${uniqueId}`)).toContainText(
    folderName,
  );

  await page.setInputFiles("#markdown-file", {
    name: "draft.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Draft\n\nfolder draft", "utf8"),
  });
  await page
    .locator("form")
    .filter({ has: page.locator("#markdown-file") })
    .getByRole("button", { name: /上传 Markdown|涓婁紶 Markdown/ })
    .click();
  await expect(page.locator("p[role='status']")).toBeVisible();

  await page.goto(
    `/admin-archive-portal/tree?selected=${encodeURIComponent(`${uniqueId}/${folderName}/resource`)}&kind=resource`,
  );
  await page.setInputFiles("#image-files", {
    name: "preview.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#333"/></svg>`,
      "utf8",
    ),
  });
  await page
    .locator("form")
    .filter({ has: page.locator("#image-files") })
    .getByRole("button", { name: /上传图片|涓婁紶鍥剧墖/ })
    .click();
  await expect(page.locator("p[role='status']")).toBeVisible();

  await page.goto(
    `/admin-archive-portal/tree?selected=${encodeURIComponent(`${uniqueId}/${folderName}`)}&kind=directory`,
  );
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByTestId("delete-selected-node").click();
  await expect(page).toHaveURL(/status=success/);
  await expect(page.getByTestId(`library-tree-${uniqueId}`)).not.toContainText(
    folderName,
  );

  await page.goto(
    `/admin-archive-portal/tree?selected=${encodeURIComponent(uniqueId)}&kind=library`,
  );
  page.once("dialog", async (dialog) => {
    await dialog.accept();
  });
  await page.getByTestId("delete-selected-node").click();
  await expect(page).toHaveURL(/status=success/);
  await expect(page.getByTestId(`library-panel-${uniqueId}`)).toHaveCount(0);
});
