import { z } from 'zod';

/**
 * Headline stats: the four numbers that lead the Experience section.
 *
 * These are impact figures rather than inventory counts. An earlier version
 * derived them from the content layer (number of projects, certifications,
 * skills), which had the nice property of never going stale but meant the
 * headline numbers were "4" and "3" — true, and completely unpersuasive. These
 * are hand-authored from `resume/main.tex` instead, so they need updating when
 * the resume does.
 *
 * `value` is the number the counter animates to; `prefix` and `suffix` are
 * rendered around it and are not animated, which is what lets "$200K+" count up
 * as 200 rather than as a string.
 */

export const Stat = z.object({
  /** The number to count up to. Must be finite and non-negative. */
  value: z.number().nonnegative().finite(),
  /** Rendered immediately before the value, e.g. "$". */
  prefix: z.string().min(1).optional(),
  /** Rendered immediately after the value, e.g. "K+" or "%". */
  suffix: z.string().min(1).optional(),
  /** Caption under the number. Kept short: it sits in a narrow column. */
  label: z.string().min(1).max(48),
});
export type Stat = z.infer<typeof Stat>;

export const Stats = z
  .array(Stat)
  .min(1)
  .refine(
    (s) => new Set(s.map((x) => x.label)).size === s.length,
    'stat labels must be unique',
  );
export type Stats = z.infer<typeof Stats>;

export const stats: Stats = Stats.parse([
  {
    value: 50,
    suffix: '+',
    label: 'services owned in production',
  },
  {
    value: 200,
    prefix: '$',
    suffix: 'K+',
    label: 'per year saved in cloud costs',
  },
  {
    value: 45,
    suffix: '%',
    label: 'lower monthly AWS spend',
  },
  {
    value: 3,
    suffix: '+',
    label: 'years in cloud and DevOps',
  },
]);
