import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { DASHBOARD_URL } from './helpers';

/**
 * Customer Information File (CIF) form tests.
 *
 * Tell the test how to reach the form, in .env:
 *   CIF_URL=https://.../ci/#/your-cif-path        (direct address), or
 *   CIF_MENU=Customer Information > Customer Information File    (menu clicks, in order)
 */
const CIF_URL = process.env.CIF_URL;
const CIF_MENU = process.env.CIF_MENU;

// ---------- helpers ----------
const field = (page: Page, label: string | RegExp) => page.getByLabel(label).first();

async function pick(page: Page, label: RegExp, option?: string | RegExp) {
  await page.getByRole('combobox', { name: label }).click();
  const opts = page.getByRole('option');
  await (option ? opts.filter({ hasText: option }).first() : opts.first()).click();
}

const submit = (page: Page) => page.getByRole('button', { name: /submit/i }).click();

async function openCif(page: Page) {
  if (CIF_URL) {
    await page.goto(CIF_URL);
    return;
  }
  await page.goto(DASHBOARD_URL);
  for (const step of CIF_MENU!.split('>').map((s) => s.trim()).filter(Boolean)) {
    await page.getByText(step).first().click();
  }
}

test.describe('CIF form', () => {
  test.skip(!CIF_URL && !CIF_MENU, 'Set CIF_URL or CIF_MENU in .env');

  test.beforeEach(async ({ page }) => {
    await openCif(page);
    await expect(page.getByText('Customer Information').first()).toBeVisible();
  });

  // ---------- layout & defaults ----------
  test('shows Submit and Back buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /submit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /back/i })).toBeVisible();
  });

  test('defaults: code is 88 and country is Bangladesh', async ({ page }) => {
    await expect(field(page, /^Code/)).toHaveValue('88');
    await expect(page.getByRole('combobox', { name: /Country/ })).toContainText('Bangladesh');
  });

  // ---------- required fields ----------
  test('empty submit shows validation errors', async ({ page }) => {
    await submit(page);
    await expect(page.locator('mat-error').first()).toBeVisible();
    expect(await page.locator('mat-error').count()).toBeGreaterThan(0);
  });

  // ---------- mobile number ----------
  const mobileCases = [
    { value: '01712345678', valid: true, note: 'valid 11-digit number' },
    { value: '123', valid: false, note: 'too short' },
    { value: 'abcdefghijk', valid: false, note: 'letters only' },
    { value: '0171234567890123', valid: false, note: 'too long' },
  ];
  for (const c of mobileCases) {
    test(`mobile "${c.value}" is ${c.valid ? 'accepted' : 'rejected'} (${c.note})`, async ({ page }) => {
      const mobile = field(page, /Mobile Number/);
      await mobile.fill(c.value);
      await field(page, /^Name/).click(); // blur to trigger validation
      const invalid = await mobile.evaluate(
        (e) => e.classList.contains('ng-invalid') || e.getAttribute('aria-invalid') === 'true'
      );
      expect(invalid).toBe(!c.valid);
    });
  }

  // ---------- email ----------
  const emailCases = [
    { value: 'user@example.com', valid: true },
    { value: 'user@', valid: false },
    { value: 'not-an-email', valid: false },
  ];
  for (const c of emailCases) {
    test(`email "${c.value}" is ${c.valid ? 'accepted' : 'rejected'}`, async ({ page }) => {
      const email = field(page, /^Email/);
      await email.fill(c.value);
      await field(page, /^Name/).click();
      const invalid = await email.evaluate(
        (e) => e.classList.contains('ng-invalid') || e.getAttribute('aria-invalid') === 'true'
      );
      expect(invalid).toBe(!c.valid);
    });
  }

  // ---------- text inputs ----------
  test('name accepts text', async ({ page }) => {
    await field(page, /^Name/).fill('QA_AUTO Test Customer');
    await expect(field(page, /^Name/)).toHaveValue('QA_AUTO Test Customer');
  });

  test('Verified NID checkbox toggles', async ({ page }) => {
    const nid = page.getByRole('checkbox', { name: /Verified NID/ });
    await expect(nid).not.toBeChecked();
    await nid.check();
    await expect(nid).toBeChecked();
    await nid.uncheck();
    await expect(nid).not.toBeChecked();
  });

  // ---------- cascading location dropdowns ----------
  test('division selection loads districts', async ({ page }) => {
    await pick(page, /Division/);
    await page.getByRole('combobox', { name: /District/ }).click();
    expect(await page.getByRole('option').count()).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  });

  test('changing division resets district', async ({ page }) => {
    await pick(page, /Division/);
    await pick(page, /District/);
    const district = page.getByRole('combobox', { name: /District/ });
    await expect(district).not.toContainText('Select one');

    await page.getByRole('combobox', { name: /Division/ }).click();
    await page.getByRole('option').nth(1).click();
    await expect(district).toContainText('Select one');
  });

  test('district selection loads upazillas', async ({ page }) => {
    await pick(page, /Division/);
    await pick(page, /District/);
    await page.getByRole('combobox', { name: /Upazilla/ }).click();
    expect(await page.getByRole('option').count()).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  });

  // ---------- sector search ----------
  test('Search button is visible and clickable', async ({ page }) => {
    const search = page.getByRole('button', { name: /search/i });
    await expect(search).toBeVisible();
    await expect(search).toBeEnabled();
  });

  // ---------- successful submit ----------
  // Creates a real record in QA. Remove .skip when ready and update the API URL pattern.
  test.skip('valid form submits successfully', async ({ page }) => {
    const unique = Date.now().toString().slice(-8);

    await pick(page, /Title/);
    await field(page, /^Name/).fill(`QA_AUTO ${unique}`);
    await pick(page, /Customer Type/);
    await field(page, /Mobile Number/).fill(`017${unique}`);
    // TODO: fill Sector (search + select)
    await field(page, /Address Line\*/).fill('House 1, Road 2, QA Test');
    await pick(page, /Division/);
    await pick(page, /District/);

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes('/api/')),
      submit(page),
    ]);
    expect(response.ok()).toBeTruthy();
  });
});
