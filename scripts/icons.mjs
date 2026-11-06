// Generates every site icon from one design: an "r·k" monogram in EB Garamond,
// ink on cream with a crimson middle dot, inside a thin ink frame.
//
//   public/favicon.svg            browsers that take SVG icons (most today)
//   public/favicon-16x16.png      \
//   public/favicon-32x32.png       |  PNG fallbacks
//   public/favicon.ico             |  (16 + 32, PNG-in-ICO)
//   public/apple-touch-icon.png    |  iOS home screen, 180
//   public/android-chrome-*.png    |  Android / manifest, 192 and 512
//   public/mstile-150x150.png     /   Windows tiles
//
// Run after changing the design:   npm run icons
//
// The SVG favicon embeds the 512px render, so it shows the exact EB Garamond
// letterforms without depending on the visitor having the font.
// Uses Playwright's Chromium, already a dev dependency.
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = new URL('../', import.meta.url);
const out = (file) => new URL(`public/${file}`, root);
const fontB64 = readFileSync(
  new URL('node_modules/@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2', root),
).toString('base64');

const PAPER = '#FAF7F2';
const INK = '#161514';
const ACCENT = '#9E2A2B';

const browser = await chromium.launch();
const page = await browser.newPage();

const html = (size, { frame = true, transparent = false } = {}) => /* html */ `<!doctype html>
<html><head><style>
  @font-face { font-family: 'G'; font-weight: 400 800; src: url(data:font/woff2;base64,${fontB64}) format('woff2'); }
  html, body { margin: 0; background: ${transparent ? 'transparent' : PAPER}; }
  .icon { width: ${size}px; height: ${size}px; position: relative; box-sizing: border-box;
          display: flex; align-items: center; justify-content: center;
          font-family: 'G', Georgia, serif; font-weight: 600; color: ${INK};
          font-size: ${size * 0.56}px; line-height: 1; letter-spacing: -0.01em; }
  .icon::after { content: ''; position: absolute; inset: ${size * 0.06}px;
                 border: ${Math.max(1, size * 0.035)}px solid ${INK}; display: ${frame ? 'block' : 'none'}; }
  .dot { color: ${ACCENT}; margin: 0 ${size * 0.015}px; font-weight: 700; }
  .word { transform: translateY(-${size * 0.04}px); }
</style></head><body><div class="icon"><span class="word">r<span class="dot">·</span>k</span></div></body></html>`;

async function png(size, file, options) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(html(size, options));
  await page.evaluate(() => document.fonts.ready);
  const buffer = await page.locator('.icon').screenshot({ omitBackground: options?.transparent ?? false });
  writeFileSync(out(file), buffer);
  return buffer;
}

// Tab sizes (16, 32) can't hold three glyphs and a frame, so they get a single
// bold crimson "r" on cream instead.
async function tabIcon(size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(/* html */ `<!doctype html><html><head><style>
    @font-face { font-family: 'G'; font-weight: 400 800; src: url(data:font/woff2;base64,${fontB64}) format('woff2'); }
    html, body { margin: 0; }
    .icon { width: ${size}px; height: ${size}px; background: ${PAPER}; display: flex; align-items: center;
            justify-content: center; font: 800 ${size * 1.05}px/1 'G', Georgia, serif; color: ${ACCENT}; }
    .icon span { transform: translateY(-${size * 0.1}px); }
  </style></head><body><div class="icon"><span>r</span></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const buffer = await page.locator('.icon').screenshot();
  writeFileSync(out(file), buffer);
  return buffer;
}
const p16 = await tabIcon(16, 'favicon-16x16.png');
const p32 = await tabIcon(32, 'favicon-32x32.png');
await png(180, 'apple-touch-icon.png');
await png(192, 'android-chrome-192x192.png');
await png(512, 'android-chrome-512x512.png');
await png(150, 'mstile-150x150.png');

// ICO containing the 16 and 32 PNGs (PNG-compressed entries are valid in ICO).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries = [];
  let offset = 6 + 16 * images.length;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += data.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}
writeFileSync(out('favicon.ico'), ico([{ size: 16, data: p16 }, { size: 32, data: p32 }]));

// SVG favicon: wraps the 512px render.
const big = readFileSync(out('android-chrome-512x512.png')).toString('base64');
writeFileSync(
  out('favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" role="img" aria-label="r · k">
  <!-- Generated by scripts/icons.mjs: "r·k" in EB Garamond, ink on cream, crimson dot. Edit the script, not this file. -->
  <image width="512" height="512" href="data:image/png;base64,${big}"/>
</svg>
`,
);


await browser.close();
console.log('icons written to public/');
