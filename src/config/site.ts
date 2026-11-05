/**
 * Site configuration and feature flags.
 *
 * The single source of truth for the site's name, its address, its contact
 * details, and how its pages link to each other. `src/data/profile.ts` reads
 * its contact fields from here, so changing an email or a URL here changes it
 * everywhere: pages, JSON-LD, RSS, and llms.txt.
 *
 * EDIT THIS FILE to:
 *  - publish `/showcase` (`showShowcaseInNav: true`): it then appears in the
 *    footer's "Elsewhere" row, the sitemap, and llms.txt, and loses its noindex;
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
  /**
   * The browser-tab title: the whole tab title on the front page, and the
   * suffix on every other page ("Threads · r · k").
   */
  readonly title: string;
  /**
   * The site's name where a monogram would mean nothing to a stranger: social
   * cards (og:site_name, og:title), the RSS feed, and JSON-LD.
   */
  readonly name: string;
  /** Default meta description. */
  readonly description: string;
  readonly author: string;
  /** BCP 47 language tag for <html lang>, RSS, and JSON-LD. */
  readonly language: string;
  /**
   * When `false`, `/showcase` is left out of the footer, sitemap, and llms.txt,
   * is disallowed in robots.txt, and carries `noindex, nofollow`. The page
   * itself is always built. (It is never in the top navigation, which stays at
   * four items.)
   */
  readonly showShowcaseInNav: boolean;
  /**
   * Same-origin JSON feed for the readings on `/builds/homelab/`, or `null` to
   * skip the request. When the request fails or returns something
   * off-contract, the readings fall back to a simulation and say so. The shape
   * is documented on `HomelabStatusPayload` in `src/lib/homelab/telemetry.ts`.
   */
  readonly homelabStatusEndpoint: string | null;
  readonly contact: SiteContact;
  /** The footer colophon. `hostingLink` is the linked part of `hosting`. */
  readonly colophon: {
    readonly hosting: string;
    readonly hostingLink: { readonly text: string; readonly href: string };
    readonly copyright: string;
  };
}

export const SITE_CONFIG: SiteConfig = {
  url: 'https://rajatdev.fun',
  title: 'r · k',
  name: 'Rajat Khirid',
  description:
    'Rajat Khirid is a Cloud and DevOps engineer in Pune. Things he has built, things he has written, and books he has read, served from a homelab.',
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
    hosting: 'Self-hosted on my',
    hostingLink: { text: 'homelab', href: '/builds/homelab/' },
    copyright: "2086© (so I don't forget to change the year) · Rajat Khirid",
  },
};

/** Stable identifiers for the site's pages, used to mark the current page in links. */
export type SectionKey =
  | 'home'
  | 'builds'
  | 'homelab'
  | 'agent'
  | 'threads'
  | 'reads'
  | 'now'
  | 'about'
  | 'colophon'
  | 'showcase';

export interface NavItem {
  readonly key: SectionKey;
  readonly label: string;
  readonly href: string;
}

/**
 * The top navigation: always these four. The home item's label is drawn by
 * SiteHeader as "r · k" with a crimson middle dot; `label` is its accessible
 * name. The order follows the title: builds (things I've made), threads
 * (things I've written), reads (books I've read).
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'builds', label: 'builds', href: '/builds/' },
  { key: 'threads', label: 'threads', href: '/threads/' },
  { key: 'reads', label: 'reads', href: '/reads/' },
];

/**
 * Every other page, linked from the footer's "Elsewhere" row on every page so
 * they all point at each other. `/showcase` is added only when public.
 */
export const SECONDARY_ITEMS: readonly NavItem[] = [
  { key: 'about', label: 'about', href: '/about/' },
  { key: 'now', label: 'now', href: '/now/' },
  { key: 'homelab', label: 'homelab', href: '/builds/homelab/' },
  { key: 'agent', label: 'triage agent', href: '/builds/triage-agent/' },
  { key: 'colophon', label: 'colophon', href: '/colophon/' },
  { key: 'showcase', label: 'showcase', href: '/showcase/' },
];

/** True when `/showcase` may be linked, indexed, and listed in machine-readable files. */
export function showcaseIsPublic(config: SiteConfig = SITE_CONFIG): boolean {
  return config.showShowcaseInNav;
}

/** The top navigation. */
export function getNavItems(): readonly NavItem[] {
  return NAV_ITEMS;
}

/** The footer's "Elsewhere" links, with `/showcase` gated by its flag. */
export function getSecondaryItems(config: SiteConfig = SITE_CONFIG): readonly NavItem[] {
  return SECONDARY_ITEMS.filter((item) => item.key !== 'showcase' || showcaseIsPublic(config));
}

/** An absolute URL on this site, for feeds, JSON-LD, and llms.txt. */
export function absoluteUrl(path: string, config: SiteConfig = SITE_CONFIG): string {
  return new URL(path, `${config.url}/`).toString();
}
