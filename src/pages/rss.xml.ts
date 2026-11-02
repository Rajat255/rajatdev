import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';

import { SITE_CONFIG, absoluteUrl } from '../config/site';
import { getPublishedNotes, noteHref } from '../lib/notes';

/**
 * /rss.xml — every published note, with its full text, for feed readers.
 *
 * Each note is rendered to HTML through Astro's container API, so the feed
 * gets exactly the HTML the page does (headings, code, lists). Root-relative
 * links and images are made absolute, because feed readers show the content
 * away from this site.
 */

/** Rewrites `href="/…"` and `src="/…"` to absolute URLs on this site. */
const absolutize = (html: string): string =>
  html.replace(/\s(href|src)="\/(?!\/)/g, (_, attr: string) => ` ${attr}="${SITE_CONFIG.url}/`);

export const GET: APIRoute = async () => {
  const notes = await getPublishedNotes();
  const container = await AstroContainer.create();

  const items = await Promise.all(
    notes.map(async (note) => {
      const { Content } = await note.render();
      const html = await container.renderToString(Content);
      return {
        title: note.data.title,
        description: note.data.description,
        pubDate: note.data.pubDate,
        link: absoluteUrl(noteHref(note)),
        categories: [note.data.category, ...note.data.tags],
        content: absolutize(html),
        customData: `<dc:creator>${SITE_CONFIG.author}</dc:creator>`,
      };
    }),
  );

  return rss({
    title: `${SITE_CONFIG.title} · Notes`,
    description: `Notes and essays by ${SITE_CONFIG.author} on cloud infrastructure, cost work, self-hosting, and rabbit holes.`,
    site: SITE_CONFIG.url,
    items,
    xmlns: { dc: 'http://purl.org/dc/elements/1.1/', atom: 'http://www.w3.org/2005/Atom' },
    customData: [
      `<language>${SITE_CONFIG.language}</language>`,
      `<atom:link href="${absoluteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />`,
    ].join(''),
    trailingSlash: true,
  });
};
