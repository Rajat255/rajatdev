import { z } from 'zod';

/**
 * Showcase content: independent web projects on `/showcase`.
 *
 * The page always builds, but stays out of the navigation, the footer, the
 * sitemap, and llms.txt (and is marked noindex) until `showShowcaseInNav` is
 * flipped to `true` in `src/config/site.ts`.
 *
 * EDIT THIS FILE to list a new site. The two "Untitled" entries are
 * placeholders: replace them with the real thing when it ships, and set `url`
 * once there is somewhere public to send people.
 */

export const ShowcaseStatus = z.enum(['Live', 'In the Lab', 'Stealth']);
export type ShowcaseStatus = z.infer<typeof ShowcaseStatus>;

export const ShowcaseItem = z.object({
  title: z.string().min(1),
  tagline: z.string().min(1).max(120),
  status: ShowcaseStatus,
  /** Public URL, or `null` while there is nothing to link to yet. */
  url: z.string().url().nullable(),
  techStack: z.array(z.string().min(1)).min(1),
  year: z.number().int().min(2000).max(2100),
  /** A short note: why it exists, what is interesting about it. */
  note: z.string().min(1).max(400),
});
export type ShowcaseItem = z.infer<typeof ShowcaseItem>;

export const ShowcaseItems = z
  .array(ShowcaseItem)
  .min(1)
  .refine(
    (list) => new Set(list.map((item) => item.title)).size === list.length,
    'showcase titles must be unique',
  );
export type ShowcaseItems = z.infer<typeof ShowcaseItems>;

export const showcaseItems: ShowcaseItems = ShowcaseItems.parse([
  {
    title: 'GeekFixx',
    tagline: 'A wellness app that looks after you while you look at a screen.',
    status: 'Live',
    url: 'https://github.com/Rajat255/GeekFixx-ReactApp',
    techStack: ['React', 'Machine Learning', 'Python'],
    year: 2023,
    note: 'Uses machine learning to correct your posture, and nudges you to look away from the screen, drink water, and take breaks. The oldest thing on this page, and still the one most likely to tell you to sit up straight.',
  },
  {
    // TODO: confirm the year the homelab went live and its actual stack.
    title: 'The Homelab',
    tagline: 'The bare-metal box this site runs on.',
    status: 'Live',
    url: 'https://rajatdev.fun',
    techStack: ['Linux', 'Astro', 'Self-hosted'],
    year: 2025,
    note: 'A server at home that serves rajatdev.fun to the open web. The uptime guarantee is simple: if you can read this, it is up.',
  },
  {
    title: 'Untitled Site No. 1',
    tagline: 'A forthcoming site for the independent web.',
    status: 'In the Lab',
    url: null,
    techStack: ['Astro', 'TypeScript'],
    year: 2026,
    note: 'A placeholder until it ships. Details here once there is something to show.',
  },
  {
    title: 'Untitled Site No. 2',
    tagline: 'Another experiment, still on the workbench.',
    status: 'In the Lab',
    url: null,
    techStack: ['TBD'],
    year: 2026,
    note: 'Early sketches only. It gets a proper entry once it can survive a visitor.',
  },
]);
