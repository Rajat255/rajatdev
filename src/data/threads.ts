/**
 * Threads content for `/threads`, beyond the books (which live in books.ts):
 * the ongoing rabbit holes, and a small French learning log.
 *
 * Plain typed data, no Zod: nothing here is shipped to the browser, but it
 * keeps this file as easy to edit as a list.
 *
 * EDIT THIS FILE to add a rabbit hole or a line to the French log. The French
 * renderings in `english` are the author's own.
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
    title: 'French, at about B1',
    note: 'I read French books in the original, slowly, with a dictionary within reach. A few lines I’ve collected are below.',
    link: { label: 'the French log', href: '#french-log' },
  },
  {
    title: 'Two wheels',
    note: 'A bicycle most of the time, and a motorbike for the longer trips. The 1,500 km Konkan coast ride is on the timeline below.',
    link: { label: 'the route', href: '#timeline' },
  },
  {
    title: 'Photography',
    note: 'Mostly taken on rides. The photo frames on the Konkan route are waiting for the good ones.',
  },
  {
    title: 'The homelab',
    note: 'The bare-metal box at home that serves this site, and the reason I learn something new about Linux every month.',
    link: { label: 'its readings', href: '/builds/#homelab' },
  },
];

export interface FrenchLine {
  readonly kind: 'Quotation' | 'Word';
  readonly french: string;
  readonly english: string;
  readonly source: string;
}

export const frenchLog: readonly FrenchLine[] = [
  {
    kind: 'Quotation',
    french: 'Aujourd’hui, maman est morte. Ou peut-être hier, je ne sais pas.',
    english: 'Mother died today. Or maybe yesterday, I don’t know.',
    source: 'Albert Camus, L’Étranger (1942), the opening line',
  },
  {
    kind: 'Word',
    french: 'éblouir',
    english: 'to dazzle, to blind with light. The sun in L’Étranger does a great deal of it.',
    source: 'From L’Étranger',
  },
  {
    kind: 'Quotation',
    french: 'On ne voit bien qu’avec le cœur. L’essentiel est invisible pour les yeux.',
    english: 'One sees clearly only with the heart. What is essential is invisible to the eye.',
    source: 'Antoine de Saint-Exupéry, Le Petit Prince (1943)',
  },
  {
    kind: 'Word',
    french: 'les grandes personnes',
    english: 'grown-ups. The Little Prince’s verdict: they never understand anything by themselves.',
    source: 'From Le Petit Prince',
  },
];
