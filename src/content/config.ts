import { defineCollection, z } from 'astro:content';

/**
 * Content collections. In both, the filename (minus extension) becomes the URL
 * slug.
 *
 * `notes`: the posts under `src/content/notes/`, in Markdown or MDX.
 * `src/content/notes/foo.md` is published at /threads/foo/ (and raw at
 * /threads/foo.md), and is added automatically to /rss.xml, /llms.txt,
 * /llms-full.txt, and the sitemap. Reading time and word count are calculated.
 *
 * `books`: one file per book under `src/content/books/`. The frontmatter is the
 * book's details; the body is what you write about it (leave it empty until
 * you have something to say). `src/content/books/foo.md` is listed on /reads,
 * gets its own page at /reads/foo/, and shows on /now while `status: reading`.
 *
 * The site's other structured data (profile, experience, ...) lives in
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

export const BOOK_STATUSES = ['reading', 'completed', 'antilibrary'] as const;

const books = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().min(1),
    /** English title, for a book read in another language. */
    translatedTitle: z.string().min(1).optional(),
    author: z.string().min(1),
    /** Year of first publication. */
    year: z.number().int().min(1000).max(2100),
    /**
     * `reading` (on the nightstand, and shown on /now), `completed`, or
     * `antilibrary` (bought, not yet read).
     */
    status: z.enum(BOOK_STATUSES),
    /**
     * BCP 47 code of the language the title is in: `en`, `fr`, `mr` (Marathi),
     * `hi`, … Never shown; it sets `lang` on the title so browsers and screen
     * readers pronounce it right, and `inLanguage` in the JSON-LD.
     */
    language: z
      .string()
      .regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, 'Use a lowercase BCP 47 code, e.g. en, fr, mr')
      .default('en'),
    /** Genre line, printed under the book. */
    category: z.string().min(1).max(60),
    /** A one- or two-sentence note, shown in the list on /reads. */
    notes: z.string().min(1).max(320),
    /** When you started and finished it. Optional; used to order the shelf. */
    started: z.coerce.date().optional(),
    finished: z.coerce.date().optional(),
    /** Drafts show in `astro dev` and are left out of production builds. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { notes, books };
