// Generates public/og-card.png, the 1200×630 image used when a page from this
// site is shared (Open Graph / Twitter). A plain text card in the site's own
// type and colours, so links never preview with a photo.
//
// Run after changing the wording or colours:   npm run og-card
//
// Uses Playwright's Chromium (already a dev dependency for the e2e tests) to
// render the HTML below with EB Garamond from node_modules.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const font = (file) =>
  readFileSync(new URL(`node_modules/@fontsource-variable/eb-garamond/files/${file}`, root)).toString('base64');

const html = /* html */ `<!doctype html>
<html><head><style>
  @font-face { font-family: 'Garamond'; font-weight: 400 800; font-style: normal;
    src: url(data:font/woff2;base64,${font('eb-garamond-latin-wght-normal.woff2')}) format('woff2'); }
  @font-face { font-family: 'Garamond'; font-weight: 400 800; font-style: italic;
    src: url(data:font/woff2;base64,${font('eb-garamond-latin-wght-italic.woff2')}) format('woff2'); }
  html, body { margin: 0; }
  body {
    width: 1200px; height: 630px; box-sizing: border-box;
    background: #FAF7F2; color: #161514; font-family: 'Garamond', Georgia, serif;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    text-align: center; padding: 64px; border: 18px solid #FAF7F2;
    outline: 2px solid #161514; outline-offset: -34px;
  }
  .name { color: #9E2A2B; font-weight: 700; font-size: 92px; letter-spacing: 0.16em;
          text-transform: uppercase; margin: 0 0 0 0.16em; line-height: 1; }
  .role { font-size: 34px; font-style: italic; margin: 26px 0 0; color: #5A554C; }
  .rule { width: 420px; border-top: 1.5px solid #161514; border-bottom: 1.5px solid #161514;
          height: 5px; margin: 42px 0; }
  .lines { font-size: 30px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;
           line-height: 1.6; margin: 0 0 0 0.2em; }
  .url { font-size: 26px; letter-spacing: 0.12em; margin-top: 40px; color: #5A554C; }
</style></head><body>
  <p class="name">Rajat Khirid</p>
  <p class="role">Cloud &amp; DevOps engineer</p>
  <div class="rule"></div>
  <p class="lines">Things I’ve made · things I’ve written<br />and books I’ve read</p>
  <p class="url">rajatdev.fun</p>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const out = fileURLToPath(new URL('public/og-card.png', root));
await page.screenshot({ path: out });
await browser.close();
console.log(`wrote ${out}`);
