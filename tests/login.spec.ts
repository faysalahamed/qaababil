import { test, expect } from '@playwright/test';
import { forceHttps } from './https-fix';
import { DASHBOARD_URL } from './helpers';

// Logged-OUT tests: they never use your real session.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test.beforeEach(async ({ page, context }) => {
    await forceHttps(context);
    await page.goto(DASHBOARD_URL); // not logged in -> redirected to the login form
    await expect(page.locator('input[name="username"]')).toBeVisible({ timeout: 40_000 });
  });

  test('shows username and password fields', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  // a fake username cannot lock or log in the real QA account
  test('wrong credentials are rejected', async ({ page }) => {
    await page.locator('input[name="username"]').fill('no_such_user_qa');
    await page.locator('#password').pressSequentially('WrongPass123', { delay: 30 });
    await page.locator('form.login-form button').first().click();
    await expect(page).not.toHaveURL(/\/ci\/#\/dashboard/);
  });

  test('empty submit does not log in', async ({ page }) => {
    await page.locator('form.login-form button').first().click();
    await expect(page).not.toHaveURL(/\/ci\/#\/dashboard/);
  });
});
