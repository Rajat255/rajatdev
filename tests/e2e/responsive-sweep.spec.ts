import { expect, test } from '@playwright/test';

import { allSectionIds } from '../../src/content/navigation';

/**
 * Responsive sweep.
 *
 * Walks the supported viewport range and asserts the two failure modes that a
 * fluid layout most often regresses into: horizontal overflow, and controls that
 * shrink below the minimum touch target.
 */

/** Widths spanning the smallest supported phone to the largest desktop. */
const WIDTHS = [360, 480, 768, 1024, 1280, 1920, 2560];

/** Minimum touch-target size in CSS pixels. */
const MIN_TARGET_PX = 44;

test.describe('responsive layout', () => {
  for (const width of WIDTHS) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');

      const overflows = await page.evaluate(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
        };
      });

      // A 1px tolerance absorbs sub-pixel rounding on fractional device ratios.
      expect(overflows.scrollWidth).toBeLessThanOrEqual(overflows.clientWidth + 1);
    });
  }

  test('renders every section exactly once', async ({ page }) => {
    await page.goto('/');

    for (const id of allSectionIds) {
      const section = page.locator(`section#${id}`);
      await expect(section).toHaveCount(1);
    }
  });

  test('exposes exactly one h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('keeps dock controls at or above the touch-target minimum', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/');

    const controls = page.locator('nav[aria-label="Primary"] a, nav[aria-label="Primary"] button');
    const count = await controls.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const box = await controls.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(MIN_TARGET_PX - 1);
      expect(box!.height).toBeGreaterThanOrEqual(MIN_TARGET_PX - 1);
    }
  });

  test('navigating to a section scrolls it into view', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    await page.locator('nav[aria-label="Primary"] a[href="#projects"]').click();
    await expect(page.locator('section#projects')).toBeInViewport();
  });
});

test.describe('reduced motion', () => {
  // `reducedMotion` is a browser-context option rather than a top-level test
  // option, so it is set through `contextOptions`.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('shows all content fully visible with motion disabled', async ({ page }) => {
    await page.goto('/');

    // Project cards must end up visible rather than stuck at the entrance offset.
    const cards = page.locator('[data-project-reveal]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      await expect(cards.nth(i)).toBeVisible();
      const opacity = await cards.nth(i).evaluate(
        (el) => getComputedStyle(el).opacity,
      );
      expect(Number(opacity)).toBeGreaterThan(0.99);
    }
  });
});
