import { z } from 'zod';

import { SITE_CONFIG } from '../config/site';

const { contact } = SITE_CONFIG;

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
  /** The exact moment of birth, ISO 8601 with offset. Drives the age counter on /about. */
  bornAt: z.string().datetime({ offset: true }),
  location: z.string().min(1),
  /** Concise tagline. Kept short so the hero stays compact. */
  description: z.string().min(1).max(280),
  /**
   * A fuller summary of the work, for machines: the blockquote at the top of
   * /llms.txt and /llms-full.txt, and the Person `description` in JSON-LD.
   */
  summary: z.string().min(1).max(700),
  /** Person `knowsAbout` in JSON-LD: the headline areas, not every tool. */
  knowsAbout: z.array(z.string().min(1)).min(1),
  avatarUrl: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1).optional(),
  /** Path to the downloadable resume PDF in `public/`. */
  resumeUrl: z.string().min(1),
  /**
   * Where this site runs, shown as a status pill in the footer. For a DevOps
   * portfolio the hosting is part of the pitch, so it is stated plainly rather
   * than left for someone to guess from a DNS lookup.
   *
   * Split into two fields rather than one sentence so the badge can emphasise the
   * last word without matching on substrings.
   */
  hosting: z.object({
    /** Leading text, e.g. "Self-hosted on my". Kept short: it sits in a pill. */
    text: z.string().min(1).max(60),
    /** The accented tail word, e.g. "homelab". */
    emphasis: z.string().min(1).max(30),
  }),
  socials: z.array(SocialLink).min(1),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const profile: Profile = ProfileSchema.parse({
  name: 'Rajat Khirid',
  initials: 'RK',
  role: 'Cloud & DevOps Engineer',
  birthday: '2001-08-04',
  // 16:16 in India (IST, UTC+05:30). Drives the live age counter on /about.
  bornAt: '2001-08-04T16:16:00+05:30',
  // Contact fields come from `src/config/site.ts`, the single source of truth.
  location: contact.location,
  // Doubles as the hero subtext and the meta/OG description, so it has to state
  // the position rather than list hobbies. The previous line ("I love programming
  // ... cycling, taking photos") undersold a page that goes on to document a
  // $200K/year saving, and it was also what every search result and shared link
  // showed. Cycling and photography live in About, where they belong.
  description:
    'Three years scaling AWS and Kubernetes for 50+ services, with the observability to catch problems before anyone files a ticket.',
  summary:
    'Rajat Khirid is a Cloud and DevOps engineer based in Pune, India, and an AWS Certified Solutions Architect – Professional (SAP-C02). At amber, where he spent more than eight months as the sole DevOps engineer for 50+ production services on AWS, he led a FinOps programme that cut monthly AWS spend by 45% (about $200K a year), migrated workloads from ECS to Amazon EKS with Karpenter and KEDA, and built MCP-based AI agents that triage and fix CI/CD failures on their own. He self-hosts this site on a bare-metal homelab.',
  knowsAbout: [
    'AWS',
    'Kubernetes',
    'Amazon EKS',
    'Terraform',
    'FinOps',
    'Site Reliability Engineering',
    'AI Agents',
  ],
  avatarUrl: '/images/avatar.png',
  email: contact.email,
  phone: contact.phone,
  resumeUrl: contact.resume,
  hosting: {
    text: 'Self-hosted on my',
    emphasis: 'homelab',
  },
  socials: [
    {
      name: 'GitHub',
      url: contact.github,
      handle: 'Rajat255',
      navbar: true,
    },
    {
      name: 'LinkedIn',
      url: contact.linkedin,
      handle: 'rajatkhirid',
      navbar: true,
    },
    {
      name: 'Blog',
      url: contact.blog,
      handle: 'rajats.hashnode.dev',
      navbar: true,
    },
    {
      name: 'Email',
      url: `mailto:${contact.email}`,
      handle: contact.email,
      navbar: true,
    },
  ],
});
