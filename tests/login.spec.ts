import { test, expect } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows username and password fields', async ({ page }) => {
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  // Uses a fake username, so it can't lock your real QA account
  test('wrong credentials are rejected', async ({ page }) => {
    await page.locator('input[name="username"]').fill('no_such_user_qa');
    await page.locator('#password').pressSequentially('WrongPass123', { delay: 30 });
    await page.locator('form.login-form button').first().click();
    await expect(page).not.toHaveURL(/#\/menu/);
  });

  test('empty submit does not log in', async ({ page }) => {
    await page.locator('form.login-form button').first().click();
    await expect(page).not.toHaveURL(/#\/menu/);
  });

  // Opt-in: creates a real session, so run it alone, when nothing else is logged in
  test('valid login goes to menu', async ({ page }) => {
    test.skip(!process.env.RUN_LOGIN_FLOW, 'Set RUN_LOGIN_FLOW=1 to run');
    await page.locator('input[name="username"]').fill(process.env.QA_USER!);
    await page.locator('#password').pressSequentially(process.env.QA_PASS!, { delay: 80 });
    await page.locator('form.login-form button').first().click();
    await expect(page).toHaveURL(/#\/menu/);
  });
});