import { test, expect } from '@playwright/test';

test('logged-in home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/login/);
  // replace with your real home-page element:
  // await expect(page.getByText('Dashboard')).toBeVisible();
});

test('redirects to /login when no session', async ({ browser }) => {
  const ctx = await browser.newContext(); // no storageState
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await ctx.close();
});