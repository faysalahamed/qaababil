import { test as setup, expect } from '@playwright/test';
require('dotenv').config();

const AUTH_FILE = 'auth.json';

setup('login to ababil', async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
  await expect(page).toHaveURL(/\/login/);

  await page.getByPlaceholder('Type your username').fill(process.env.ABABIL_USER!);
  await page.getByPlaceholder('Type your password').fill(process.env.ABABIL_PASS!);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: AUTH_FILE });
});