import { z } from 'zod';

/**
 * Profile content: identity, contact, and social links used by the hero, the
 * navigation dock, and the contact section.
 *
 * Every content module in this folder follows the same pattern: a Zod schema, an
 * inferred TypeScript type, and validated seed data parsed at module load. A
 * malformed edit therefore fails the build (and the test suite) instead of
 * silently shipping a broken page.
 *
 * EDIT THIS FILE to change your name, tagline, location, or socials.
 */

/** ISO calendar date in `YYYY-MM-DD` form. */
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected an ISO date (YYYY-MM-DD)');

/**
 * A single social / contact link.
 *
 * - `name` is the display name of the destination (GitHub, LinkedIn, ...).
 * - `url` accepts http(s) links and `mailto:` links.
 * - `handle` is an optional short display handle.
 * - `navbar` flags whether the link surfaces in the floating dock.
 */
export const SocialLink = z.object({
  name: z.string().min(1),
  url: z
    .string()
    .min(1)
    .refine(
      (u) => /^https?:\/\//.test(u) || u.startsWith('mailto:'),
      'expected an http(s) URL or a mailto: link',
    ),
  handle: z.string().min(1).optional(),
  navbar: z.boolean(),
});
export type SocialLink = z.infer<typeof SocialLink>;

export const ProfileSchema = z.object({
  name: z.string().min(1),
  /** Monogram shown when the avatar image is missing or fails to load. */
  initials: z.string().min(1).max(3),
  /** Role / title line shown under the name. */
  role: z.string().min(1).max(120),
  birthday: IsoDate,
  location: z.string().min(1),
  /** Concise tagline. Kept short so the hero stays compact. */
  description: z.string().min(1).max(280),
  avatarUrl: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  /** Path to the downloadable resume PDF in `public/`. */
  resumeUrl: z.string().min(1),
  socials: z.array(SocialLink).min(1),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const profile: Profile = ProfileSchema.parse({
  name: 'Rajat Khirid',
  initials: 'RK',
  role: 'Cloud & DevOps Engineer',
  birthday: '2001-01-01', // TODO: set your real birthday (drives the age line).
  location: 'Pune, India',
  description:
    'I love programming and all things Cloud and DevOps, as well as cycling, taking photos, and learning new things.',
  avatarUrl: '/images/avatar.png',
  email: 'rajatkhirid@gmail.com',
  phone: '+91 9145672952',
  resumeUrl: '/resume/rajat-khirid-resume.pdf',
  socials: [
    {
      name: 'GitHub',
      url: 'https://github.com/Rajat255',
      handle: 'Rajat255',
      navbar: true,
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/rajatkhirid/',
      handle: 'rajatkhirid',
      navbar: true,
    },
    {
      name: 'Blog',
      url: 'https://rajats.hashnode.dev/',
      handle: 'rajats.hashnode.dev',
      navbar: true,
    },
    {
      name: 'Email',
      url: 'mailto:rajatkhirid@gmail.com',
      handle: 'rajatkhirid@gmail.com',
      navbar: true,
    },
  ],
});
