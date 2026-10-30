import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['html'], ['list']],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'https://aiblqa.app.ababilng.com',
    storageState: 'auth.json',
    ignoreHTTPSErrors: true,
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chrome', use: { channel: 'chrome' } },
  ],
});