import { z } from 'zod';

/**
 * Headline stats: the four figures near the top of `/builds`.
 *
 * Impact figures, hand-authored from `resume/main.tex`, so they need updating
 * when the resume does.
 *
 * Two kinds:
 *  - a counted figure: `value`, with optional `prefix` and `suffix` printed
 *    around it. These count up from zero when scrolled into view.
 *  - a fixed label: `text`, printed as-is (e.g. a certification code).
 */

const Label = z.string().min(1).max(48);

export const CountedStat = z.object({
  /** The figure. Must be finite and non-negative. */
  value: z.number().nonnegative().finite(),
  /** Rendered immediately before the value, e.g. "$". */
  prefix: z.string().min(1).optional(),
  /** Rendered immediately after the value, e.g. "K+" or "%". */
  suffix: z.string().min(1).optional(),
  /** Caption under the figure. Kept short: it sits in a narrow column. */
  label: Label,
});
export type CountedStat = z.infer<typeof CountedStat>;

export const TextStat = z.object({
  /** Printed as-is, never animated. */
  text: z.string().min(1).max(12),
  label: Label,
});
export type TextStat = z.infer<typeof TextStat>;

export const Stat = z.union([CountedStat, TextStat]);
export type Stat = z.infer<typeof Stat>;

export const Stats = z
  .array(Stat)
  .min(1)
  .refine(
    (s) => new Set(s.map((x) => x.label)).size === s.length,
    'stat labels must be unique',
  );
export type Stats = z.infer<typeof Stats>;

// Display helpers live in `src/lib/stats.ts`, which has no Zod, so the
// StatCounters island can use them without shipping Zod to the browser.

export const stats: Stats = Stats.parse([
  {
    value: 50,
    suffix: '+',
    label: 'production services owned',
  },
  {
    value: 200,
    prefix: '$',
    suffix: 'K+',
    label: 'a year saved on AWS',
  },
  {
    value: 45,
    suffix: '%',
    label: 'lower monthly cloud spend',
  },
  {
    text: 'SAP-C02',
    label: 'AWS Solutions Architect – Professional',
  },
]);
