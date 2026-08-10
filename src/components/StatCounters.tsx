/**
 * StatCounters — animated headline numbers (React island).
 *
 * Counts each stat up from zero the first time the row scrolls into view, then
 * never again: the observer is disconnected on the first intersection, so
 * scrolling back up leaves the final values alone rather than replaying.
 *
 * Hydrated with `client:visible`, and the final values are also what render on
 * the server, so no-JS visitors and screen readers always get the real numbers
 * rather than a row of zeroes.
 *
 * Under a reduced-motion preference the count-up is skipped entirely and the
 * final values are shown immediately.
 *
 * No glass pane: these are headline figures, so they sit directly on the
 * background like the certification badges do.
 */
import { useEffect, useRef, useState } from 'react';

import { stats } from '@content/stats';

/** Duration of the count-up animation. */
const COUNT_DURATION_MS = 1400;

/** Fraction of the row that must be visible before counting starts. */
const REVEAL_THRESHOLD = 0.35;

/** Ease-out cubic, so the count decelerates into its final value. */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

export default function StatCounters() {
  // Start at the final values so the very first render (and the SSR output)
  // already shows real numbers; the animation only ever rewinds and replays
  // them once we know motion is allowed.
  const [values, setValues] = useState<number[]>(() => stats.map((s) => s.value));
  const rootRef = useRef<HTMLDListElement | null>(null);
  const hasRunRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion, or no IntersectionObserver: leave the final values as-is.
    if (reduceMotion || typeof IntersectionObserver === 'undefined') return;

    const run = () => {
      if (hasRunRef.current) return;
      hasRunRef.current = true;

      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / COUNT_DURATION_MS);
        const eased = easeOut(t);
        setValues(stats.map((s) => Math.round(s.value * eased)));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Guarantee we land exactly on the real values.
          setValues(stats.map((s) => s.value));
        }
      };

      // Rewind to zero, then animate up on the next frame.
      setValues(stats.map(() => 0));
      rafRef.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run();
          obs.unobserve(entry.target);
        }
      },
      { threshold: REVEAL_THRESHOLD },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <dl className="mb-8 mt-2 grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-4 sm:gap-x-4">
      {stats.map((stat, index) => (
        <div key={stat.label}>
          {/* The label is the accessible name for the figure, so it is announced
              before the number; the visible caption below repeats it and is
              hidden from assistive tech to avoid reading it twice. */}
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block text-3xl font-bold tracking-tight tabular-nums text-primary sm:text-4xl">
              {stat.prefix ?? ''}
              {values[index] ?? stat.value}
              {stat.suffix ?? ''}
            </span>
            <span
              aria-hidden="true"
              className="mt-1.5 block text-xs leading-snug text-muted-foreground"
            >
              {stat.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
