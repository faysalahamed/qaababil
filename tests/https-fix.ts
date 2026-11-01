import type { BrowserContext } from '@playwright/test';

/**
 * The server redirects login to http://<host>/login, but port 80 is unreachable.
 * This rewrites any http redirect to https before the browser follows it.
 * The host comes from BASE_URL in .env.
 */
export async function forceHttps(context: BrowserContext) {
  const host = new URL(process.env.BASE_URL!).hostname;

  await context.route(`https://${host}/**`, async (route) => {
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

  await context.route(`http://${host}/**`, (route) =>
    route.fulfill({
      status: 301,
      headers: { location: route.request().url().replace(/^http:\/\//i, 'https://') },
    })
  );
}
