/**
 * StatCounters — animated headline numbers (React island).
 *
 * Counts each stat up from zero once the row scrolls into view. Hydrated with
 * `client:visible`, and the final values are also what render on the server, so
 * no-JS visitors and screen readers always get the real numbers rather than a
 * row of zeroes.
 *
 * Under a reduced-motion preference the count-up is skipped entirely and the
 * final values are shown immediately.
 *
 * Values are derived from the content layer rather than hardcoded, so they stay
 * correct as projects/certifications are added.
 */
import { useEffect, useRef, useState } from 'react';

import { certifications } from '@content/certifications';
import { projects } from '@content/projects';
import { allSkills } from '@content/skills';

interface Stat {
  /** The number to count to. */
  value: number;
  label: string;
  /** Appended to the value, e.g. "+". */
  suffix?: string;
}

const STATS: Stat[] = [
  { value: projects.length, label: 'Projects shipped' },
  { value: certifications.length, label: 'Certifications' },
  { value: allSkills.length, label: 'Tools & technologies' },
];

/** Duration of the count-up animation. */
const COUNT_DURATION_MS = 1100;

/** Ease-out cubic, so the count decelerates into its final value. */
const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

export default function StatCounters() {
  // Start at the final values so the very first render (and the SSR output)
  // already shows real numbers; the animation only ever rewinds and replays
  // them once we know motion is allowed.
  const [values, setValues] = useState<number[]>(() => STATS.map((s) => s.value));
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
        setValues(STATS.map((s) => Math.round(s.value * eased)));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Guarantee we land exactly on the real values.
          setValues(STATS.map((s) => s.value));
        }
      };

      // Rewind to zero, then animate up on the next frame.
      setValues(STATS.map(() => 0));
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
      { threshold: 0.35 },
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <dl
      ref={rootRef}
      className="glass mt-2 grid grid-cols-3 gap-3 rounded-xl p-4 sm:gap-6 sm:p-5"
    >
      {STATS.map((stat, index) => (
        <div key={stat.label} className="text-center">
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className="block text-2xl font-semibold tabular-nums text-primary sm:text-3xl">
              {values[index] ?? stat.value}
              {stat.suffix ?? ''}
            </span>
            <span
              aria-hidden="true"
              className="mt-1 block text-[11px] leading-snug text-muted-foreground sm:text-xs"
            >
              {stat.label}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
