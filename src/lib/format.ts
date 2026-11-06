/**
 * Date formatting for essay lists and article bylines.
 *
 * Content dates (`pubDate`, `updatedDate`) are calendar dates: Zod coerces
 * "2026-10-12" to midnight UTC, so they are always formatted in UTC. Formatting
 * them in the build machine's local zone would print the previous day anywhere
 * west of Greenwich.
 */

/** "12 October 2026" for article bylines. */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** "November 2026", for the /now page's "Updated" line. */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** "Oct" for the month column in essay lists (set in small caps). */
export function formatMonthAbbr(date: Date): string {
  // en-GB abbreviates September as "Sept"; the list wants exactly three letters.
  return new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
}

/** Machine-readable `YYYY-MM-DD` for `<time datetime>`. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
