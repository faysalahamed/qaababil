import { test as base, expect, Page } from '@playwright/test';
import { forceHttps } from './https-fix';
import { DASHBOARD_URL, restoreSessionStorage } from './helpers';

export const test = base.extend<{ cis: Page }>({
  // applied automatically to every test
  context: async ({ context }, use) => {
    await forceHttps(context);
    await restoreSessionStorage(context);
    await use(context);
  },

  // the CIS dashboard, already logged in
  cis: async ({ page }, use) => {
    await page.goto(DASHBOARD_URL);
    await use(page);
  },
});

export { expect };
