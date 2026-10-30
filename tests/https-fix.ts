import type { BrowserContext } from '@playwright/test';

const HOST = 'aiblqa.app.ababilng.com';

// The server answers with redirects to http://aiblqa... (port 80 is unreachable).
// This rewrites any such Location header to https before the browser sees it.
export async function forceHttps(context: BrowserContext) {
  await context.route(`https://${HOST}/**`, async (route) => {
    try {
      const response = await route.fetch({ maxRedirects: 0 });
      const headers = response.headers();
      if (headers['location']) {
        headers['location'] = headers['location'].replace(/^http:\/\//i, 'https://');
      }
      await route.fulfill({ response, headers });
    } catch {
      await route.continue();
    }
  });

  // safety net if anything still goes to plain http
  await context.route(`http://${HOST}/**`, (route) =>
    route.fulfill({
      status: 301,
      headers: { location: route.request().url().replace(/^http:\/\//i, 'https://') },
    })
  );
}