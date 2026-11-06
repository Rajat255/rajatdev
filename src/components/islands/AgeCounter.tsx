/**
 * AgeCounter — my age in years as a decimal on an odometer (React island, on
 * /about), e.g. "25.2531987041 years old".
 *
 * Age = time since the birth moment ÷ the average Gregorian year
 * (365.2425 days). Each digit is a wheel: a strip of 0–9 (plus a second 0 so
 * 9 can roll forward into 0) inside a one-digit window. The wheels behave like
 * a mechanical odometer: a wheel turns only while the wheel to its right is
 * finishing its own turn, so the slow digits click over and the last few,
 * which change faster than the eye can follow, spin.
 *
 * On load the wheels roll up from zeros to the current age. Under reduced
 * motion there is no roll-up and no spinning: the number updates once a
 * second, with fewer decimals.
 *
 * Transforms are written straight to the DOM from a requestAnimationFrame
 * loop, so React doesn't re-render 60 times a second. The current value is
 * kept in `data-age` (the strips themselves contain every digit). The number
 * is hidden from screen readers, which would otherwise read it out
 * constantly; they get the birth date instead.
 */
import { useEffect, useRef, useState } from 'react';

export interface AgeCounterProps {
  /** ISO 8601 with an offset, e.g. "2001-08-04T16:16:00+05:30". */
  readonly bornAt: string;
  /** Read out to screen readers in place of the ticking number. */
  readonly bornLabel: string;
}

/** Average length of a Gregorian year, in milliseconds. */
const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;
const DECIMALS = 10;
const REDUCED_DECIMALS = 6;
/** How long one wheel takes to click over to its next digit. */
const ROLL_MS = 450;
/** Length of the roll-up from zeros on load. */
const INTRO_MS = 1600;
/** Height of one digit window, in em. */
const CELL_EM = 1.25;
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/** Age in fractional years. Exported for testing. */
export function decimalAge(bornMs: number, nowMs: number): number {
  return (nowMs - bornMs) / YEAR_MS;
}

/** Age counted in units of `place`; multiplies for decimals to avoid float drift from 1e-10 etc. */
const scaled = (age: number, place: number) => (place < 1 ? age * Math.round(1 / place) : age / place);

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * Position of one wheel, in digits (0 to 10, where 10 is the trailing 0).
 * `place` is the wheel's value in years (10, 1, 0.1, …). Exported for testing.
 */
export function wheelOffset(age: number, place: number, rollMs = ROLL_MS): number {
  const x = scaled(age, place);
  const whole = Math.floor(x);
  const digit = ((whole % 10) + 10) % 10;
  const fraction = x - whole;
  // Share of this wheel's cycle spent turning to the next digit.
  const window = Math.min(1, rollMs / (place * YEAR_MS));
  if (window >= 1) return digit + fraction; // turns all the time: a steady spin
  const start = 1 - window;
  return fraction <= start ? digit : digit + easeInOut((fraction - start) / window);
}

/** The value the wheels show, truncated (not rounded) like an odometer. */
function reading(age: number, decimals: number): string {
  const scale = 10 ** decimals;
  const n = Math.floor(age * scale);
  const int = Math.floor(n / scale);
  const frac = String(n - int * scale).padStart(decimals, '0');
  return `${int}.${frac}`;
}

export default function AgeCounter({ bornAt, bornLabel }: AgeCounterProps) {
  const bornMs = Date.parse(bornAt);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const stripRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const decimals = reduced ? REDUCED_DECIMALS : DECIMALS;
  // Whole-year wheels: two until I'm 100. The count is the same on the server
  // and in the browser, so hydration matches.
  const intDigits = Number.isNaN(bornMs)
    ? 2
    : Math.max(2, String(Math.floor(decimalAge(bornMs, Date.now()))).length);
  const places = [
    ...Array.from({ length: intDigits }, (_, i) => 10 ** (intDigits - 1 - i)),
    ...Array.from({ length: decimals }, (_, i) => 10 ** -(i + 1)),
  ];

  useEffect(() => {
    setReduced(
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
  }, []);

  useEffect(() => {
    if (Number.isNaN(bornMs)) return;
    const strips = stripRefs.current.slice(0, places.length);
    const place = (el: HTMLSpanElement | null, offset: number) => {
      if (el) el.style.transform = `translateY(${-offset * CELL_EM}em)`;
    };
    const show = (age: number, smooth: boolean) => {
      rootRef.current?.setAttribute('data-age', reading(age, decimals));
      strips.forEach((el, i) => {
        const p = places[i]!;
        place(el, smooth ? wheelOffset(age, p) : Math.floor(scaled(age, p)) % 10);
      });
    };

    if (reduced) {
      show(decimalAge(bornMs, Date.now()), false);
      const timer = setInterval(() => show(decimalAge(bornMs, Date.now()), false), 1000);
      return () => clearInterval(timer);
    }

    // Roll up from zeros: CSS transitions carry each wheel to where it will be
    // when the roll-up ends, then the frame loop takes over.
    const start = Date.now();
    const target = decimalAge(bornMs, start + INTRO_MS);
    strips.forEach((el, i) => {
      if (!el) return;
      const delay = i * 40;
      el.style.transition = `transform ${INTRO_MS - delay}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms`;
      place(el, wheelOffset(target, places[i]!));
    });

    let introDone = false;
    let frame = requestAnimationFrame(function tick() {
      const now = Date.now();
      const age = decimalAge(bornMs, now);
      if (!introDone && now - start >= INTRO_MS) {
        introDone = true;
        strips.forEach((el) => el && (el.style.transition = 'none'));
      }
      if (introDone) show(age, true);
      else rootRef.current?.setAttribute('data-age', reading(age, decimals));
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
    // `places` is derived from intDigits and decimals, which are listed.
  }, [bornMs, reduced, decimals, intDigits]);

  if (Number.isNaN(bornMs)) return null;

  return (
    <span className="inline-flex items-center gap-[0.35em]">
      <span ref={rootRef} aria-hidden="true" className="inline-flex tabular-nums text-ink" data-odometer="">
        {places.map((p, i) => (
          <span key={p} className="contents">
            {p === 0.1 && <span style={{ lineHeight: `${CELL_EM}em` }}>.</span>}
            <span
              className="inline-block overflow-hidden"
              style={{ height: `${CELL_EM}em`, lineHeight: `${CELL_EM}em`, width: '1ch' }}
            >
              <span
                ref={(el) => {
                  stripRefs.current[i] = el;
                }}
                className="block will-change-transform"
              >
                {STRIP.map((d, j) => (
                  <span key={j} className="block text-center">
                    {d}
                  </span>
                ))}
              </span>
            </span>
          </span>
        ))}
      </span>
      <span aria-hidden="true">years old</span>
      <span className="sr-only">Born {bornLabel}</span>
    </span>
  );
}
