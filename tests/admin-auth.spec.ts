import { expect, test } from "@playwright/test";

test("unauthenticated access to hidden admin route redirects to login", async ({
  page,
}) => {
  await page.goto("/admin-archive-portal");

  await expect(page).toHaveURL(/\/admin-archive-portal\/login$/);
  await expect(
    page.getByRole("heading", { name: "管理员登录" }),
  ).toBeVisible();
});

test("default admin can log in and log out", async ({ page }) => {
  await page.goto("/admin-archive-portal/login");

  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin");
  await page.getByRole("button", { name: "进入后台" }).click();

  await expect(page).toHaveURL(/\/admin-archive-portal$/);
  await expect(
    page.getByRole("heading", { name: "后台访问已受控，当前管理员已登录。" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/admin-archive-portal\/login$/);
});

test("invalid admin credentials show an error", async ({ page }) => {
  await page.goto("/admin-archive-portal/login");

  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("wrong-password");
  await page.getByRole("button", { name: "进入后台" }).click();

  await expect(page.locator("p[role='alert']")).toContainText("用户名或密码错误。");
});

test("admin can upload markdown and image files and see them in the tree", async ({
  page,
}) => {
  const uniqueId = `playwright-${Date.now()}`;
  const markdownName = `${uniqueId}.md`;
  const imageName = `${uniqueId}.svg`;

  await page.goto("/admin-archive-portal/login");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("admin");
  await page.getByRole("button", { name: "进入后台" }).click();

  await page.getByRole("link", { name: "上传文章" }).click();
  await page.selectOption("#target-directory", "java-notes");
  await page.setInputFiles("#markdown-file", {
    name: markdownName,
    mimeType: "text/markdown",
    buffer: Buffer.from(`# ${uniqueId}\n\n这是由 Playwright 上传的测试文章。`, "utf8"),
  });
  await page.setInputFiles("#image-files", {
    name: imageName,
    mimeType: "image/svg+xml",
    buffer: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#333"/></svg>`,
      "utf8",
    ),
  });
  await page.getByRole("button", { name: "上传文章与资源" }).click();

  await expect(page.locator("p[role='status']")).toContainText("上传成功");

  await page.getByRole("link", { name: "知识库树" }).click();
  await expect(page.getByTestId("admin-tree-view")).toContainText(markdownName);
  await expect(page.getByTestId("admin-tree-view")).toContainText("resource");
  await expect(page.getByTestId("admin-tree-view")).toContainText(imageName);
});
