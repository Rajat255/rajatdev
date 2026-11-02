/**
 * StatCounters — animated headline figures (React island).
 *
 * Counts each numeric stat up from zero the first time the row scrolls into
 * view, then never again: the observer is disconnected on the first
 * intersection, so scrolling back up leaves the final values alone rather than
 * replaying. Text stats (like "SAP-C02") are printed as-is.
 *
 * Hydrated with `client:visible`, and the final values are also what render on
 * the server, so no-JS visitors and screen readers always get the real numbers
 * rather than a row of zeroes.
 *
 * Under a reduced-motion preference the count-up is skipped entirely and the
 * final values are shown immediately.
 *
 * Used near the top of `/builds`.
 */
import { useEffect, useRef, useState } from 'react';

// The validated stats arrive as props from the page; the data module itself
// (which runs Zod) is imported for its types only, so Zod never ships to the
// browser.
import type { Stats } from '../../data/stats';
import { displayStat, isCounted } from '../../lib/stats';

export interface StatCountersProps {
  readonly stats: Stats;
}

/** Duration of the count-up animation. */
const COUNT_DURATION_MS = 1400;

/** Fraction of the row that must be visible before counting starts. */
const REVEAL_THRESHOLD = 0.35;

/** Ease-out cubic, so the count decelerates into its final value. */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** The final number for each stat (0 for text stats, which never count). */
const finalNumbers = (stats: Stats): number[] => stats.map((s) => (isCounted(s) ? s.value : 0));

export default function StatCounters({ stats }: StatCountersProps) {
  // Start at the final values so the very first render (and the SSR output)
  // already shows real numbers; the animation only ever rewinds and replays
  // them once we know motion is allowed.
  const [values, setValues] = useState<number[]>(() => finalNumbers(stats));
  const rootRef = useRef<HTMLDListElement | null>(null);
  const hasRunRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Without a ref on the <dl> this is null and the counter silently never runs,
    // which is exactly the bug this guard used to hide. See StatCounters.test.tsx.
    const root = rootRef.current;
    if (!root) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion, or no IntersectionObserver: leave the final values as-is.
    if (reduceMotion || typeof IntersectionObserver === 'undefined') return;

    const targets = finalNumbers(stats);

    const run = () => {
      if (hasRunRef.current) return;
      hasRunRef.current = true;

      // The clock is taken from the first frame's own timestamp rather than a
      // separate performance.now() call, so there is only ever one time base in
      // play. Mixing the two risks a negative elapsed time, which the easing
      // would happily turn into negative numbers on screen. `t` is clamped at
      // both ends for the same reason.
      let startTs: number | null = null;

      const tick = (now: number) => {
        if (startTs === null) startTs = now;
        const t = Math.min(1, Math.max(0, (now - startTs) / COUNT_DURATION_MS));
        const eased = easeOut(t);
        setValues(targets.map((target) => Math.round(target * eased)));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Guarantee we land exactly on the real values.
          setValues(targets);
        }
      };

      // Rewind to zero, then animate up on the next frame.
      setValues(targets.map(() => 0));
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
  }, [stats]);

  return (
    <dl
      ref={rootRef}
      className="grid grid-cols-2 gap-x-6 gap-y-6 border-y border-rule py-6 text-center"
    >
      {stats.map((stat, index) => (
        <div key={stat.label}>
          {/* The label is the accessible name for the figure, so it is announced
              before the number; the visible caption below repeats it and is
              hidden from assistive tech to avoid reading it twice. */}
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block text-3xl font-medium tabular-nums text-ink">
              {displayStat(stat, values[index])}
            </span>
            <span aria-hidden="true" className="block text-base leading-snug text-muted">
              {stat.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
