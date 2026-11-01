import { test as teardown } from '@playwright/test';
import fs from 'fs';
import 'dotenv/config';
import { forceHttps } from './https-fix';
import {
  AUTH_FILE, DASHBOARD_URL, isLoggedIn, logout, removeAuthFiles, restoreSessionStorage,
} from './helpers';

// Runs after ALL tests (even if some failed) and logs the user out.
teardown('logout', async ({ browser }) => {
  teardown.setTimeout(120_000);

  if (!fs.existsSync(AUTH_FILE)) {
    console.log('No saved session - nothing to log out');
    return;
  }

  const ctx = await browser.newContext({ storageState: AUTH_FILE, ignoreHTTPSErrors: true, viewport: null });
  await forceHttps(ctx);
  await restoreSessionStorage(ctx);
  const page = await ctx.newPage();

  try {
    await page.goto(DASHBOARD_URL);
    if (await isLoggedIn(page)) {
      await logout(page);
      console.log('Logged out successfully');
    } else {
      console.log('Session already ended');
    }
    removeAuthFiles(); // only after a good logout, so a failed logout is retried next run
  } finally {
    await ctx.close();
  }
});
