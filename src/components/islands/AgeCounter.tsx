/**
 * AgeCounter — my age, live, down to the second (React island, on /about).
 *
 * Counts calendar years, months, and days, then hours, minutes, and seconds,
 * from the birth moment, ticking once a second. Calendar maths is done on the
 * wall clock of the birth time zone (IST), so the age rolls over to a new year
 * at 16:16 on 4 August in India, wherever the visitor is.
 *
 * Server output has no counter (it would be stale by the time anyone read it):
 * the line underneath states the birth date, and the counter fills in once the
 * island hydrates. The ticking text is hidden from screen readers, which would
 * otherwise read it out every second; they get the birth date instead.
 */
import { useEffect, useState } from 'react';

export interface AgeCounterProps {
  /** ISO 8601 with an offset, e.g. "2001-08-04T16:16:00+05:30". */
  readonly bornAt: string;
}

export interface Age {
  readonly years: number;
  readonly months: number;
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

/** The UTC offset in minutes from an ISO string, e.g. "+05:30" → 330. */
function offsetMinutes(iso: string): number {
  const match = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3]));
}

/** Days in a month (0-based month), in the proleptic Gregorian calendar. */
const daysIn = (year: number, month: number): number => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

/**
 * Calendar age between two instants, measured on the wall clock at
 * `offset` minutes from UTC. Exported for testing.
 */
export function ageBetween(bornMs: number, nowMs: number, offset: number): Age {
  // Shift both instants so their UTC fields read as wall-clock time in the zone.
  const b = new Date(bornMs + offset * 60_000);
  const n = new Date(nowMs + offset * 60_000);

  let years = n.getUTCFullYear() - b.getUTCFullYear();
  let months = n.getUTCMonth() - b.getUTCMonth();
  let days = n.getUTCDate() - b.getUTCDate();
  let seconds =
    n.getUTCHours() * 3600 + n.getUTCMinutes() * 60 + n.getUTCSeconds() -
    (b.getUTCHours() * 3600 + b.getUTCMinutes() * 60 + b.getUTCSeconds());

  // Borrow from the next unit up whenever a unit goes negative.
  if (seconds < 0) {
    seconds += 86_400;
    days -= 1;
  }
  if (days < 0) {
    // Borrow the length of the month before `now`'s month.
    const prevMonth = (n.getUTCMonth() + 11) % 12;
    const prevYear = prevMonth === 11 ? n.getUTCFullYear() - 1 : n.getUTCFullYear();
    days += daysIn(prevYear, prevMonth);
    months -= 1;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return {
    years,
    months,
    days,
    hours: Math.floor(seconds / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

const UNITS = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;

const plural = (value: number, unit: string): string => `${value} ${value === 1 ? unit.slice(0, -1) : unit}`;

export default function AgeCounter({ bornAt }: AgeCounterProps) {
  const bornMs = Date.parse(bornAt);
  const offset = offsetMinutes(bornAt);
  // `null` until mounted, so the server never renders a stale age.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (Number.isNaN(bornMs)) return null;
  const age = now === null ? null : ageBetween(bornMs, now, offset);

  return (
    <p className="min-h-[3.4em] text-center tabular-nums text-ink" aria-hidden="true">
      {age && (
        <>
          <span className="font-semibold text-accent">{plural(age.years, 'years')}</span>
          {UNITS.slice(1).map((unit, index) => (
            <span key={unit}>
              {index === UNITS.length - 2 ? ' and ' : ', '}
              {plural(age[unit], unit)}
            </span>
          ))}
          <span> old.</span>
        </>
      )}
    </p>
  );
}
