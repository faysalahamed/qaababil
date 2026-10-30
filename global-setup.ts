import { chromium } from '@playwright/test';
import fs from 'fs';
import { forceHttps } from './tests/https-fix';

const BASE = 'https://aiblprocess.app.ababilng.com/login';

export default async function globalSetup() {
  const user = process.env.QA_USER;
  const pass = process.env.QA_PASS;

  const browser = await chromium.launch({ channel: 'chrome' });

  // 1) Reuse the saved session if it still works (avoids a second login)
  if (fs.existsSync('auth.json')) {
    const ctx = await browser.newContext({ storageState: 'auth.json', ignoreHTTPSErrors: true });
    await forceHttps(ctx);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/#/menu`).catch(() => {});
    const valid = await p.locator('a.btn-box').first()
      .waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    await ctx.close();
    if (valid) {
      console.log('Reusing saved session (auth.json)');
      await browser.close();
      return;
    }
    console.log('Saved session expired, logging in again');
  }

  if (!user || !pass) {
    await browser.close();
    throw new Error('Set QA_USER and QA_PASS environment variables first.');
  }

  // 2) Fresh login
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  await forceHttps(context);
  const page = await context.newPage();

  try {
    await page.goto(BASE + '/');
    await page.locator('input[name="username"]').fill(user, { timeout: 30_000 });
    await page.locator('#password').pressSequentially(pass, { delay: 80 });
    await page.locator('form.login-form button').first().click();
    await page.waitForURL(/#\/menu/, { timeout: 30_000 });
    await context.storageState({ path: 'auth.json' });
  } catch (e) {
    const url = page.url();
    const msg = await page.locator('.error-container').innerText().catch(() => '');
    await page.screenshot({ path: 'login-debug.png', fullPage: true });
    if (url.includes('error=')) {
      throw new Error(
        `Login refused (${url}). ${msg.trim()}\n` +
        'If this account is already logged in on another device/browser, log it out first.'
      );
    }
    throw e;
  } finally {
    await browser.close();
  }
}