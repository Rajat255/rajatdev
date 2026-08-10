// Throwaway: checks that every timeline entry actually reveals when scrolled past.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
await page.goto('http://localhost:4399/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

const readOpacities = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.tl-item')].map((item) => ({
      title: item.querySelector('.tl-card-title span').textContent.slice(0, 24),
      opacity: getComputedStyle(item).opacity,
    })),
  );

// Walk the page the way a reader would, a viewport at a time.
const height = await page.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y <= height; y += 400) {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(250);
}
await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(1200);

console.log('after scrolling the whole page:');
console.log(JSON.stringify(await readOpacities(), null, 2));
await browser.close();
