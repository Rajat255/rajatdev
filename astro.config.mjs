// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

import { SITE_CONFIG, showcaseIsPublic } from './src/config/site.ts';

/**
 * Static-first Astro configuration.
 *
 * Every page prerenders to plain HTML at build time, and so do the machine-
 * readable files: /rss.xml, /llms.txt, /llms-full.txt, /robots.txt, and the raw
 * Markdown mirror of each note. React is used only for small islands that need
 * state. Everything else is server-rendered Astro.
 *
 * `site` builds canonical, Open Graph, sitemap, and feed URLs.
 */

/**
 * Paths kept out of the sitemap: the /notes redirect pages, and /showcase
 * while it is unlisted.
 */
/**
 * Posts whose slug changed after they went live: old slug → new slug. Each old
 * address, under /threads and /notes, redirects to the new one.
 */
const renamedPosts = {
  'assassinating-load-balancers': 'how-to-cut-your-aws-bill-by-45-percent',
  'notes-from-a-pune-homelab': 'notes-from-a-homelab',
};
const renamedRedirects = Object.fromEntries(
  Object.entries(renamedPosts).flatMap(([from, to]) => [
    [`/threads/${from}`, `/threads/${to}/`],
    [`/notes/${from}`, `/threads/${to}/`],
  ]),
);

const unlisted = [
  '/notes/',
  '/404',
  ...Object.keys(renamedPosts).map((slug) => `/threads/${slug}/`),
  ...(showcaseIsPublic() ? [] : ['/showcase/']),
];

export default defineConfig({
  site: SITE_CONFIG.url,
  output: 'static',
  trailingSlash: 'ignore',
  // Posts moved from /notes to /threads after the site went live. This keeps
  // the old index working; each old post URL is redirected by
  // src/pages/notes/[slug].astro (static builds can't do dynamic redirects here).
  redirects: {
    '/notes': '/threads',
    ...renamedRedirects,
  },
  devToolbar: { enabled: false },
  integrations: [
    react(),
    mdx(),
    tailwind({ applyBaseStyles: true }),
    sitemap({
      filter: (page) => !unlisted.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
  markdown: {
    // The `css-variables` theme emits custom properties instead of fixed
    // colours; src/styles/global.css maps them onto the paper's ink, so code
    // blocks follow the theme toggle.
    shikiConfig: { theme: 'css-variables', wrap: false },
  },
  build: {
    // Emit `notes/index.html` style paths so the site works on any static host.
    format: 'directory',
  },
});
