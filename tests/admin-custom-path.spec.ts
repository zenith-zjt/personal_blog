import { expect, test, type Page } from "@playwright/test";

const customAdminPath = process.env.ADMIN_ROUTE_BASE;

async function loginAsAdmin(page: Page) {
  await page.goto(`${customAdminPath}/login`);
  await page.locator("#admin-username").fill("admin");
  await page.locator("#admin-password").fill("admin");
  await page
    .locator("form")
    .filter({ has: page.locator("#admin-username") })
    .getByRole("button")
    .click();
  await expect(page).toHaveURL(new RegExp(`${customAdminPath}$`));
}

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

test("custom admin path keeps the admin session when switching pages", async ({
  page,
}) => {
  await loginAsAdmin(page);

  await page.locator(`a[href='${customAdminPath}/settings']`).click();
  await expect(page).toHaveURL(new RegExp(`${customAdminPath}/settings$`));
  await expect(page.locator("#settings-current-password")).toBeVisible();

  await page.locator(`a[href='${customAdminPath}/import-export']`).click();
  await expect(page).toHaveURL(new RegExp(`${customAdminPath}/import-export$`));
  await expect(
    page.locator(`a[href='${customAdminPath}/import-export/system/export']`),
  ).toBeVisible();
});
