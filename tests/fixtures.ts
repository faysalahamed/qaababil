import { test as base, expect, Page } from '@playwright/test';
import { forceHttps } from './https-fix';

export const test = base.extend<{ cis: Page }>({
  context: async ({ context }, use) => {
    await forceHttps(context);
    await use(context);
  },
  cis: async ({ page }, use) => {
    await page.goto('/ci/');
    await use(page);
  },
});

export { expect };