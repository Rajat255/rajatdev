/**
 * The /now page: what I'm focused on at the moment, in the style of
 * nownownow.com (a page that answers "what are you up to these days?").
 *
 * EDIT THIS FILE whenever things change, and bump `updated`. The reading list
 * is not here: it comes from the `reading` books in `src/content/books/`, so
 * /now and /reads can never disagree.
 *
 * To be listed on nownownow.com, submit the page at https://nownownow.com/about
 * once it reads the way you want.
 */

export interface NowItem {
  readonly heading: string;
  /** One or two sentences, first person. */
  readonly text: string;
  readonly link?: { readonly label: string; readonly href: string };
}

export interface NowPage {
  /** ISO date (YYYY-MM-DD) the page was last updated. */
  readonly updated: string;
  readonly location: string;
  readonly items: readonly NowItem[];
}

// TODO: Rajat, rewrite these in your own words. They are drafted only from
// facts already on the site.
export const now: NowPage = {
  updated: '2026-11-03',
  location: 'Pune, India',
  items: [
    {
      heading: 'Work',
      text: 'Running EKS, Karpenter, and KEDA in production at amber, and teaching the triage agent to handle more kinds of broken builds on its own.',
      link: { label: 'the triage agent', href: '/builds/triage-agent/' },
    },
    {
      heading: 'Building',
      text: 'plot-it.fun, a new app, in the evenings.',
      link: { label: 'builds', href: '/builds/#projects-heading' },
    },
    {
      heading: 'Tinkering',
      text: 'Keeping the homelab that serves this site running, and breaking it on purpose now and then.',
      link: { label: 'the homelab', href: '/builds/homelab/' },
    },
  ],
};
