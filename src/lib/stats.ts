/**
 * Display helpers for the headline stats. Kept apart from `src/data/stats.ts`
 * (which validates with Zod at import time) so the StatCounters island can use
 * them without pulling Zod into the browser bundle.
 */
import type { CountedStat, Stat } from '../data/stats';

/** True for a figure that counts up. */
export function isCounted(stat: Stat): stat is CountedStat {
  return 'value' in stat;
}

/** The text shown for a stat, with a counted figure shown at `current`. */
export function displayStat(stat: Stat, current?: number): string {
  if (!isCounted(stat)) return stat.text;
  return `${stat.prefix ?? ''}${current ?? stat.value}${stat.suffix ?? ''}`;
}
