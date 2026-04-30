import { expect, test } from "@playwright/test";

const customAdminPath = process.env.ADMIN_ROUTE_BASE;

test.skip(
  !customAdminPath || customAdminPath === "/admin-archive-portal",
  "ADMIN_ROUTE_BASE is not configured for custom path verification.",
);

test("custom admin path rewrites to the internal admin portal and hides default path", async ({
  page,
}) => {
  const defaultResponse = await page.goto("/admin-archive-portal/login");
  expect(defaultResponse?.status()).toBe(404);

  const customResponse = await page.goto(`${customAdminPath}/login`);
  expect(customResponse?.status()).toBe(200);
  await expect(page.locator("#admin-username")).toBeVisible();
});
