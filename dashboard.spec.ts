import { test, expect } from './fixtures';

test.describe('CIS dashboard', () => {
  test('opens logged in', async ({ cis }) => {
    await expect(cis).toHaveURL(/\/ci\/#\/dashboard/);
    await expect(cis.locator('input[name="username"]')).toHaveCount(0);
    await expect(cis.locator('#menu-button')).toBeVisible();
  });

  test('shows the logged-in user profile', async ({ cis }) => {
    const name = cis.locator('.profile-name').first();
    // the profile block may sit inside the collapsed menu
    if (!(await name.isVisible())) await cis.locator('#menu-button').click();
    await expect(name).toBeVisible();
    await expect(name).not.toHaveText('');
  });

  test('profile drop-down shows Logout (without clicking it)', async ({ cis }) => {
    if (!(await cis.locator('.profile a').first().isVisible())) {
      await cis.locator('#menu-button').click();
    }
    await cis.locator('.profile a').first().click();
    await expect(
      cis.locator('li[role="menuitem"] a', { hasText: /log\s?out/i }).first()
    ).toBeVisible();
  });

  test('menu button opens the menu for this user role', async ({ cis }) => {
    const items = cis.locator('li[role="menuitem"] > a');
    if (!(await items.first().isVisible().catch(() => false))) {
      await cis.locator('#menu-button').click();
    }
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(0);
  });

  // Discovery helper: prints the menu entries so tests can target them exactly
  test('list menu entries', async ({ cis }) => {
    const items = cis.locator('li[role="menuitem"] > a');
    if (!(await items.first().isVisible().catch(() => false))) {
      await cis.locator('#menu-button').click();
    }
    await items.first().waitFor({ state: 'visible' });
    const texts = (await items.allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    console.log('MENU ENTRIES:', JSON.stringify(texts));
  });
});
