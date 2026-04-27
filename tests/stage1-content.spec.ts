import { expect, test } from "@playwright/test";

test("stage 1 page shows knowledge-base scan results and hides resource folders", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "内容域与文件系统能力" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "前端基础知识库总览" }).first(),
  ).toBeVisible();
  await expect(page.getByTestId("knowledge-base-tree")).toContainText(
    "frontend-foundations",
  );
  await expect(page.getByTestId("knowledge-base-tree")).not.toContainText(
    "resource",
  );
  await expect(page.getByTestId("resolved-images")).toContainText(
    "/api/assets/frontend-foundations/resource/knowledge-map.svg",
  );
});

test("content api returns libraries and public tree output", async ({ request }) => {
  const response = await request.get("/api/content");

  expect(response.ok()).toBeTruthy();

  const payload = await response.json();

  expect(payload.resourceDirectoryName).toBe("resource");
  expect(payload.libraries.length).toBeGreaterThan(1);
  expect(payload.libraries[0].tree.some((node: { name: string }) => node.name === "resource")).toBeFalsy();
});
