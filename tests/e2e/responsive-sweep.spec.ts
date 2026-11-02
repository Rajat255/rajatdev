import { expect, test, type Locator } from '@playwright/test';

import { SITE_CONFIG } from '../../src/config/site';

/**
 * Responsive sweep across every page, plus the machine-readable files.
 *
 * Asserts the failure modes a layout most often regresses into (horizontal
 * overflow, a missing or duplicated <h1>), the single-column width, structured
 * data on every page, and the `/showcase` feature flag: an unlisted page must
 * stay out of the navigation, the sitemap, llms.txt, and the index.
 */

/** Widths spanning the smallest supported phone to a large desktop. */
const WIDTHS = [360, 480, 768, 1280, 1920];

const PAGES = ['/', '/notes/', '/builds/', '/threads/', '/colophon/', '/showcase/'];

/**
 * Islands ignore clicks until hydrated, and Astro removes `ssr` from an island
 * once it is. Waits only for the island containing `control`: `client:visible`
 * islands elsewhere on the page stay unhydrated until scrolled to.
 */
const waitForHydration = (control: Locator) =>
  expect(control.locator('xpath=ancestor::astro-island[1]')).not.toHaveAttribute('ssr', /.*/);

test.describe('layout', () => {
  for (const path of PAGES) {
    for (const width of WIDTHS) {
      test(`${path} has no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        // A 1px tolerance absorbs sub-pixel rounding on fractional device ratios.
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
      });
    }

    test(`${path} exposes exactly one h1`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test(`${path} keeps a single reading column`, async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 900 });
      await page.goto(path);
      const box = await page.locator('main').boundingBox();
      expect(box).not.toBeNull();
      // The 620px column minus its 24px side padding on each side.
      expect(box!.width).toBeLessThanOrEqual(620);
    });

    test(`${path} has valid JSON-LD and an RSS alternate link`, async ({ page }) => {
      await page.goto(path);
      const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(scripts.length).toBe(1);
      const data = JSON.parse(scripts[0] ?? '') as { '@graph'?: unknown[] };
      expect(Array.isArray(data['@graph'])).toBe(true);
      await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
    });
  }

  test('every note in the list opens, with a raw Markdown mirror', async ({ page, request }) => {
    await page.goto('/notes/');
    const links = await page
      .locator('main a[href^="/notes/"]')
      .evaluateAll((anchors) => anchors.map((a) => a.getAttribute('href') ?? ''));
    expect(links.length).toBeGreaterThan(0);

    for (const href of links) {
      const response = await page.goto(href);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('article time[datetime]').first()).toBeVisible();
      await expect(page.getByRole('link', { name: '← Back to all notes' })).toBeVisible();

      const markdown = await request.get(href.replace(/\/$/, '.md'));
      expect(markdown.status()).toBe(200);
      expect(await markdown.text()).toMatch(/^---\ntitle: /);
    }
  });
});

test.describe('machine-readable files', () => {
  for (const path of ['/llms.txt', '/llms-full.txt', '/rss.xml', '/robots.txt', '/sitemap-index.xml']) {
    test(`${path} is published`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect((await response.text()).length).toBeGreaterThan(100);
    });
  }
});

test.describe('showcase feature flag', () => {
  test('matches showShowcaseInNav everywhere it is listed', async ({ page, request }) => {
    await page.goto('/showcase/');
    const robots = page.locator('meta[name="robots"]');
    const links = page.locator('a[href="/showcase/"]');
    const llms = await (await request.get('/llms.txt')).text();
    const robotsTxt = await (await request.get('/robots.txt')).text();
    const sitemap = await (await request.get('/sitemap-0.xml')).text();

    if (SITE_CONFIG.showShowcaseInNav) {
      await expect(robots).toHaveCount(0);
      await expect(links).not.toHaveCount(0);
      expect(llms).toContain('/showcase/');
      expect(robotsTxt).not.toContain('Disallow: /showcase');
      expect(sitemap).toContain('/showcase/');
    } else {
      await expect(robots).toHaveAttribute('content', 'noindex, nofollow');
      await expect(links).toHaveCount(0);
      expect(llms).not.toContain('/showcase');
      expect(robotsTxt).toContain('Disallow: /showcase');
      expect(sitemap).not.toContain('/showcase');
    }
  });

  test('other pages are indexable', async ({ page }) => {
    for (const path of PAGES.filter((p) => p !== '/showcase/')) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    }
  });
});

test.describe('interactive parts', () => {
  test('a case study opens', async ({ page }) => {
    await page.goto('/builds/');
    const details = page.locator('details', { hasText: 'AWS cost optimization' });
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', '');
    await expect(details.getByText('14 → 4')).toBeVisible();
  });

  test('the triage simulator runs all four steps', async ({ page }) => {
    await page.goto('/builds/');
    const button = page.getByRole('button', { name: 'Simulate pipeline failure' });
    await button.scrollIntoViewIfNeeded();
    await waitForHydration(button);
    await button.click();
    await expect(page.getByRole('heading', { name: /Automated action/ })).toBeVisible({ timeout: 10_000 });
  });

  test('the shelf filters to French books', async ({ page }) => {
    await page.goto('/threads/');
    const button = page.getByRole('button', { name: /^FR/ });
    await button.scrollIntoViewIfNeeded();
    await waitForHydration(button);
    await button.click();
    await expect(page.getByText('2 of 4')).toBeVisible();
  });

  test('the Konkan route unfolds from the timeline', async ({ page }) => {
    await page.goto('/threads/');
    const button = page.getByRole('button', { name: /the route/ });
    await button.scrollIntoViewIfNeeded();
    await waitForHydration(button);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('img', { name: /Konkan coast/ })).toBeVisible();
  });

  test('the dark mode toggle switches the theme', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'dark mode' });
    await toggle.scrollIntoViewIfNeeded();
    await waitForHydration(toggle);
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
