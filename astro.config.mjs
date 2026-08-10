// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

/**
 * Static-first Astro configuration.
 *
 * The whole site prerenders to plain HTML at build time; React is used only for
 * the handful of genuinely interactive islands (nav dock, theme toggle,
 * certification cards, stat counters). Everything above the fold is
 * server-rendered so first paint never waits on hydration.
 *
 * `site` is used to build canonical + Open Graph URLs. Update it to the real
 * deployed origin.
 */
export default defineConfig({
  site: 'https://rajatkhirid.dev',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: true }),
  ],
  build: {
    // Emit `about/index.html` style paths so the site works on any static host.
    format: 'directory',
  },
});
