import type { Browser, BrowserContext, Locator, Page } from '@playwright/test';
import fs from 'fs';
import { forceHttps } from './https-fix';

export const BASE_URL = (process.env.BASE_URL ?? '').replace(/\/$/, '');
export const DASHBOARD_URL = `${BASE_URL}/ci/#/dashboard`;
export const AUTH_FILE = 'auth.json';       // cookies + localStorage
export const SESSION_FILE = 'session.json'; // sessionStorage (Playwright does not save it)

const LOGOUT_RE = /log\s?out|sign\s?out/i;
const usernameInput = (page: Page) => page.locator('input[name="username"]');

const visibleSoon = (l: Locator, ms: number) =>
  l.waitFor({ state: 'visible', timeout: ms }).then(() => true).catch(() => false);

export function removeAuthFiles() {
  for (const f of [AUTH_FILE, SESSION_FILE]) if (fs.existsSync(f)) fs.rmSync(f);
}

/** Put the saved sessionStorage back into every page of this context. */
export async function restoreSessionStorage(context: BrowserContext) {
  if (!fs.existsSync(SESSION_FILE)) return;
  const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as Record<string, string>;
  const host = new URL(BASE_URL).hostname;
  await context.addInitScript(
    ({ h, entries }) => {
      if (window.location.hostname !== h) return;
      for (const [k, v] of Object.entries(entries)) {
        if (!window.sessionStorage.getItem(k)) window.sessionStorage.setItem(k, v);
      }
    },
    { h: host, entries: data }
  );
}

/** Log in through the CIS dashboard URL. Throws a clear message if the server refuses. */
export async function login(page: Page, user: string, pass: string) {
  await page.goto(DASHBOARD_URL);
  await usernameInput(page).waitFor({ state: 'visible', timeout: 40_000 });
  await usernameInput(page).fill(user);
  // the password box is masked by a script, so type key by key
  await page.locator('#password').pressSequentially(pass, { delay: 80 });
  await page.locator('form.login-form button').first().click();

  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    const href = page.url();
    if (href.includes('error=')) {
      throw new Error(
        `Login refused: ${href}\n` +
        'This account is probably still logged in somewhere (another browser, phone, or an ' +
        'earlier run that did not log out). Log it out there once, then run again.'
      );
    }
    const u = new URL(href);
    if (u.pathname.startsWith('/ci') && !href.includes('login') && !href.includes('oauth')) return;
    await page.waitForTimeout(500);
  }
  throw new Error(`Login did not reach the CIS app. Final URL: ${page.url()}`);
}

// Elements of the CIS app shell (only exist after a successful login)
const menuButton = (page: Page) => page.locator('#menu-button');
const profileLink = (page: Page) => page.locator('.profile a').first();
const logoutItem = (page: Page) =>
  page.locator('li[role="menuitem"] a', { hasText: LOGOUT_RE }).first();

/** After opening the dashboard URL: are we really inside the app (not on the login page)? */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const appShell = menuButton(page).or(page.locator('.profile')).first();
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (await usernameInput(page).isVisible().catch(() => false)) return false;
    if (await appShell.isVisible().catch(() => false)) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

/**
 * Log out through the app's own menu:
 *   (#menu-button if the menu is collapsed) -> click the profile link -> click "Logout".
 */
export async function logout(page: Page) {
  // 1) make sure the profile link is on screen (open the menu if it is collapsed)
  if (!(await visibleSoon(profileLink(page), 3000))) {
    const mb = menuButton(page);
    if (await visibleSoon(mb, 5000)) await mb.click();
  }

  // 2) open the profile drop-down, which reveals the Logout item
  const item = process.env.LOGOUT_SELECTOR ? page.locator(process.env.LOGOUT_SELECTOR).first() : logoutItem(page);
  if (!(await visibleSoon(item, 1000))) {
    const profile = process.env.USER_MENU_SELECTOR ? page.locator(process.env.USER_MENU_SELECTOR).first() : profileLink(page);
    await profile.click({ timeout: 10_000 }).catch(() => {});
  }

  if (!(await visibleSoon(item, 5000))) {
    await page.screenshot({ path: 'logout-debug.png', fullPage: true });
    throw new Error('Could not find the Logout item after opening the profile menu (see logout-debug.png).');
  }

  // 3) click Logout
  await item.click();

  // some apps ask "Are you sure?"
  const confirm = page.getByRole('button', { name: /^(yes|ok|confirm)$/i }).first();
  if (await visibleSoon(confirm, 2000)) await confirm.click();

  // 4) success = back on the login page
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (await usernameInput(page).isVisible().catch(() => false)) return;
    if (/login/.test(page.url())) return;
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'logout-debug.png', fullPage: true });
  throw new Error('Clicked Logout but the login page never appeared (see logout-debug.png).');
}

/** If an earlier run crashed and left a session open, log it out before logging in again. */
export async function cleanupStaleSession(browser: Browser) {
  if (!fs.existsSync(AUTH_FILE)) return;
  const ctx = await browser.newContext({ storageState: AUTH_FILE, ignoreHTTPSErrors: true, viewport: null });
  await forceHttps(ctx);
  await restoreSessionStorage(ctx);
  const page = await ctx.newPage();
  try {
    await page.goto(DASHBOARD_URL);
    if (await isLoggedIn(page)) {
      console.log('Found a session left by an earlier run - logging it out first');
      await logout(page);
    }
  } catch (e) {
    console.log('Stale-session cleanup skipped:', String(e).split('\n')[0]);
  } finally {
    await ctx.close();
  }
  removeAuthFiles();
}
