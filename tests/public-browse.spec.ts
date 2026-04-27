import { expect, test } from "@playwright/test";

test("homepage shows knowledge-base collection cards", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "面向公开阅读的个人知识库，而不是普通时间流博客。",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("library-grid")).toContainText(
    "前端基础知识库总览",
  );
  await expect(page.getByTestId("library-grid")).toContainText("Java 笔记入口");
});

test("knowledge-base article page shows tree navigation, breadcrumb, and rendered article", async ({
  page,
}) => {
  await page.goto("/kb/frontend-foundations/getting-started/welcome");

  await expect(
    page.getByRole("heading", { name: "欢迎页搭建说明" }),
  ).toBeVisible();
  await expect(page.getByLabel("Breadcrumb")).toContainText("前端基础知识库总览");
  await expect(page.getByLabel("frontend-foundations tree")).toContainText(
    "getting-started",
  );
  await expect(page.getByLabel("frontend-foundations tree")).not.toContainText(
    "resource",
  );
  await expect(page.getByText("这个示例文章用于验证阶段 1 的三项核心能力")).toBeVisible();
});
