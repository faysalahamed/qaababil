import { defineConfig } from '@playwright/test';
import 'dotenv/config';

const SLOW_MO = Number(process.env.SLOW_MO ?? 400); // ms pause between actions so you can watch

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },

  // Single-session account: strictly one test at a time
  workers: 1,
  fullyParallel: false,
  retries: 0,

  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.BASE_URL,
    channel: 'chrome',          // your installed Chrome
    headless: false,            // you see every action in the browser
    viewport: null,
    launchOptions: { slowMo: SLOW_MO, args: ['--start-maximized'] },
    ignoreHTTPSErrors: true,
    navigationTimeout: 60_000,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // 1) log in once; `teardown` guarantees logout runs after all tests, even on failure
    { name: 'setup', testMatch: /.*\.setup\.ts/, teardown: 'cleanup' },

    // 2) the real tests reuse the session from step 1
    {
      name: 'chrome',
      testMatch: /.*\.spec\.ts/,
      use: { storageState: 'auth.json' },
      dependencies: ['setup'],
    },

    // 3) logout (runs last)
    { name: 'cleanup', testMatch: /.*\.teardown\.ts/ },
  ],
});
