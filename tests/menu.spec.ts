import { test, expect } from '@playwright/test';

test.describe('Main menu', () => {
  test('shows all modules', async ({ page }) => {
    await page.goto('/#/menu');
    for (const name of ['Admin', 'Sanction Limit', 'CIS', 'Cash']) {
      await expect(page.locator('a.btn-box', { hasText: name })).toBeVisible();
    }
  });

  test('CIS tile opens the CIS app in a new tab', async ({ page }) => {
    await page.goto('/#/menu');
    const [cis] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('a.btn-box', { hasText: 'CIS' }).click(),
    ]);
    await cis.waitForLoadState();
    await expect(cis).toHaveURL(/\/ci\//);
  });
});
