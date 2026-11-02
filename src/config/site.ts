/**
 * Site configuration and feature flags.
 *
 * The single source of truth for the site's name, its address, its contact
 * details, and which pages appear in the navigation. `src/data/profile.ts`
 * reads its contact fields from here, so changing an email or a URL here
 * changes it everywhere: pages, JSON-LD, RSS, and llms.txt.
 *
 * EDIT THIS FILE to:
 *  - publish `/showcase` (`showShowcaseInNav: true`): it then appears in the
 *    navigation, footer, sitemap, and llms.txt, and loses its noindex;
 *  - point the homelab readings at a real status feed.
 *
 * Plain data with no dependencies, so React islands and astro.config.mjs can
 * import it without pulling Zod in.
 */

export interface SiteContact {
  readonly email: string;
  readonly phone: string;
  readonly location: string;
  readonly github: string;
  readonly linkedin: string;
  readonly blog: string;
  /** Root-relative path to the resume PDF in `public/`. */
  readonly resume: string;
}

export interface SiteConfig {
  /** Canonical origin, no trailing slash. Must match `site` in astro.config.mjs. */
  readonly url: string;
  /** Document title on the front page, and the suffix on every other page. */
  readonly title: string;
  /** Default meta description. */
  readonly description: string;
  readonly author: string;
  /** BCP 47 language tag for <html lang>, RSS, and JSON-LD. */
  readonly language: string;
  /**
   * When `false`, `/showcase` is left out of the navigation, footer, sitemap,
   * and llms.txt, is disallowed in robots.txt, and carries `noindex, nofollow`.
   * The page itself is always built.
   */
  readonly showShowcaseInNav: boolean;
  /**
   * Same-origin JSON feed for the homelab readings on `/builds/#homelab`, or
   * `null` to skip the request. When the request fails or returns something
   * off-contract, the readings fall back to a simulation and say so. The shape
   * is documented on `HomelabStatusPayload` in `src/lib/homelab/telemetry.ts`.
   */
  readonly homelabStatusEndpoint: string | null;
  readonly contact: SiteContact;
  /** The footer colophon. */
  readonly colophon: {
    readonly finis: string;
    readonly hosting: string;
    readonly copyright: string;
  };
}

export const SITE_CONFIG: SiteConfig = {
  url: 'https://rajatdev.fun',
  title: 'From Rajat',
  description:
    'Rajat Khirid is a Cloud and DevOps engineer in Pune. Things he has built, notes he has written, and books he has read, served from a homelab.',
  author: 'Rajat Khirid',
  language: 'en-IN',
  showShowcaseInNav: false,
  homelabStatusEndpoint: '/api/status.json',
  contact: {
    email: 'rajatkhirid@gmail.com',
    phone: '+91 9145672952',
    location: 'Pune, India',
    github: 'https://github.com/Rajat255',
    linkedin: 'https://www.linkedin.com/in/rajatkhirid/',
    blog: 'https://rajats.hashnode.dev/',
    resume: '/resume/rajat-khirid-resume.pdf',
  },
  colophon: {
    finis: 'Finis',
    hosting: 'Self-hosted on bare metal in Pune',
    copyright: "2086© (so I don't forget to change the year) · Rajat Khirid",
  },
};

/** Stable identifiers for the site's pages, used to mark the current nav item. */
export type SectionKey = 'home' | 'notes' | 'builds' | 'threads' | 'colophon' | 'showcase';

export interface NavItem {
  readonly key: SectionKey;
  readonly label: string;
  readonly href: string;
}

/**
 * The top navigation, in order. The home item's label is drawn by SiteHeader
 * as "r · k" with a crimson middle dot; `label` is its accessible name.
 * `/colophon` is linked from the front page and footer rather than the nav.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'notes', label: 'notes', href: '/notes/' },
  { key: 'builds', label: 'builds', href: '/builds/' },
  { key: 'threads', label: 'threads', href: '/threads/' },
  { key: 'showcase', label: 'showcase', href: '/showcase/' },
];

/** True when `/showcase` may be linked, indexed, and listed in machine-readable files. */
export function showcaseIsPublic(config: SiteConfig = SITE_CONFIG): boolean {
  return config.showShowcaseInNav;
}

/** Navigation items, with `/showcase` gated by its flag. */
export function getNavItems(config: SiteConfig = SITE_CONFIG): readonly NavItem[] {
  return NAV_ITEMS.filter((item) => item.key !== 'showcase' || showcaseIsPublic(config));
}

/** An absolute URL on this site, for feeds, JSON-LD, and llms.txt. */
export function absoluteUrl(path: string, config: SiteConfig = SITE_CONFIG): string {
  return new URL(path, `${config.url}/`).toString();
}
