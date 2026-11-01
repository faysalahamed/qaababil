import { test as setup } from '@playwright/test';
import fs from 'fs';
import 'dotenv/config';
import { forceHttps } from './https-fix';
import {
  AUTH_FILE, BASE_URL, SESSION_FILE, cleanupStaleSession, isLoggedIn, login,
} from './helpers';

setup('login to CIS', async ({ browser }) => {
  setup.setTimeout(180_000);

  const user = process.env.ABABIL_USER;
  const pass = process.env.ABABIL_PASS;
  if (!BASE_URL || !user || !pass) {
    throw new Error('.env must define BASE_URL, ABABIL_USER and ABABIL_PASS');
  }

  // 0) a crashed earlier run may have left the account logged in
  await cleanupStaleSession(browser);

  // 1) fresh login
  const context = await browser.newContext({ ignoreHTTPSErrors: true, viewport: null });
  await forceHttps(context);
  const page = await context.newPage();

  try {
    await login(page, user, pass);
    if (!(await isLoggedIn(page))) {
      throw new Error(`Logged in but the app is not showing. URL: ${page.url()}`);
    }

    await context.storageState({ path: AUTH_FILE });
    const session = await page.evaluate(() => {
      const o: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)!;
        o[k] = sessionStorage.getItem(k)!;
      }
      return o;
    });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session));
    console.log('Login OK - session saved');
  } catch (e) {
    await page.screenshot({ path: 'login-debug.png', fullPage: true }).catch(() => {});
    throw e;
  } finally {
    await context.close();
  }
});
