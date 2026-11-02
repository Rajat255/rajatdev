import { defineCollection, z } from 'astro:content';

/**
 * Content collections.
 *
 * `notes` holds the essays under `src/content/notes/`, in Markdown or MDX. The
 * filename (minus extension) becomes the URL slug, so
 * `src/content/notes/foo.md` is published at:
 *
 *   /notes/foo/     the page
 *   /notes/foo.md   the raw Markdown mirror
 *
 * and is added automatically to /rss.xml, /llms.txt, /llms-full.txt, and the
 * sitemap. Reading time and word count are calculated from the text.
 *
 * The site's structured data (profile, experience, books, ...) lives in
 * `src/data/` instead.
 */

export const NOTE_CATEGORIES = ['Infrastructure', 'Essays', 'Field Notes', 'Rabbit Holes'] as const;

const notes = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    /** One sentence. Used in lists, meta descriptions, RSS, and llms.txt. */
    description: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string().min(1)).default([]),
    category: z.enum(NOTE_CATEGORIES),
    /** Drafts show in `astro dev` and are left out of production builds. */
    draft: z.boolean().default(false),
    /** Set when the essay was first published elsewhere, e.g. on the blog. */
    canonicalUrl: z.string().url().optional(),
  }),
});

export const collections = { notes };
