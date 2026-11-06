/**
 * Threads content for `/threads`, beyond the posts (books live on /reads):
 * the ongoing rabbit holes.
 *
 * Plain typed data, no Zod: nothing here is shipped to the browser, but it
 * keeps this file as easy to edit as a list.
 *
 * EDIT THIS FILE to add a rabbit hole.
 */

export interface RabbitHole {
  readonly title: string;
  /** One or two sentences, first person. */
  readonly note: string;
  /** Optional link to more, e.g. a page section on this site. */
  readonly link?: { readonly label: string; readonly href: string };
}

// TODO: Rajat, rewrite these in your own words and add routes, photos, and
// anything else you're deep into.
export const rabbitHoles: readonly RabbitHole[] = [
  {
    title: 'Two wheels',
    note: 'A bicycle most of the time, and a motorbike for the longer trips, like the 1,500 km ride down the Konkan coast from Mumbai to Goa and back.',
  },
  {
    title: 'Photography',
    note: 'Mostly taken on rides.',
  },
  {
    title: 'The homelab',
    note: 'The bare-metal box at home that serves this site, and the reason I learn something new about Linux every month.',
    link: { label: 'its readings', href: '/builds/homelab/' },
  },
];

