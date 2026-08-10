/**
 * ThemeToggle — light/dark theme switch (React island).
 *
 * Swaps the `.dark`/`.light` class on <html> and persists the choice to
 * localStorage under the `theme` key. The initial class is set synchronously by
 * the no-flash init script in Layout.astro; this island adopts that class on
 * mount and stays in sync, so there is never a flash and first paint never
 * depends on hydration.
 *
 * The swap is wrapped in a View Transition so the new theme wipes outward from
 * this button as a circular ripple (see `lib/dom/themeRipple.ts`). That is a pure
 * enhancement: where the API is missing, or the visitor prefers reduced motion,
 * the theme changes instantly instead.
 *
 * The icon advertises the destination rather than the current state: dark mode
 * shows a sun (tap for light), light mode shows a moon.
 *
 * SSR-safety: the DOM and localStorage are only touched inside effects and
 * handlers, never during render. Until the mount effect runs, `theme` is `null`
 * and the button renders the dark-default (sun) icon, matching server output.
 *
 * Accessibility: a native <button> with a stable `aria-label`, full keyboard
 * operability, and a >=44x44px activation target. The glyphs are decorative.
 */
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { computeRippleOrigin, runThemeRipple } from '../lib/dom/themeRipple';

type Theme = 'light' | 'dark';

/** Minimum touch-target size in CSS pixels. */
const MIN_TARGET_PX = 44;

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

const SunIcon = (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = (
  <svg {...iconProps}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/**
 * Forwards the underlying <button> so the parent dock can include this control in
 * its pointer magnification. The component keeps its own internal ref as well,
 * for measuring the ripple origin, so the two are merged in the ref callback
 * below.
 */
const ThemeToggle = forwardRef<HTMLButtonElement>(function ThemeToggle(
  _props,
  forwardedRef,
) {
  // `null` until mounted so render never reads the DOM; the server-rendered
  // markup (dark default) is preserved until hydration.
  const [theme, setTheme] = useState<Theme | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Guards against a second click landing mid-transition, which would snapshot
  // the page while the previous ripple was still running.
  const transitioningRef = useRef(false);

  useEffect(() => {
    const current: Theme = document.documentElement.classList.contains('light')
      ? 'light'
      : 'dark';
    setTheme(current);
  }, []);

  const toggle = useCallback(async () => {
    if (transitioningRef.current) return;

    const root = document.documentElement;
    const next: Theme = root.classList.contains('light') ? 'dark' : 'light';

    // Idempotent, so it stays correct if the ripple's error path re-runs it.
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      root.classList.add(next);
      try {
        localStorage.setItem('theme', next);
      } catch {
        // Persistence is best-effort; the in-page toggle still works without it.
      }
    };

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // The ripple grows from the button, so a missing ref means no origin and the
    // helper falls back to an instant swap.
    const rect = buttonRef.current?.getBoundingClientRect() ?? null;
    const origin = rect
      ? computeRippleOrigin(rect, window.innerWidth, window.innerHeight)
      : null;

    transitioningRef.current = true;
    try {
      await runThemeRipple({ applyTheme, origin, root, doc: document, reduceMotion });
    } finally {
      transitioningRef.current = false;
      // Read the class back rather than trusting `next`, so the icon reflects the
      // DOM's actual state even if something else changed it meanwhile.
      setTheme(root.classList.contains('light') ? 'light' : 'dark');
    }
  }, []);

  const isLight = theme === 'light';

  return (
    <button
      ref={(node) => {
        // Keep the internal ref (ripple origin) and the forwarded ref (dock
        // magnification) pointing at the same node.
        buttonRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      aria-pressed={isLight}
      /* Sized like the dock anchors so the magnification loop can drive
         width/height directly; the minimums keep the touch target legal even
         before the first frame runs. */
      style={{
        width: `${MIN_TARGET_PX}px`,
        height: `${MIN_TARGET_PX}px`,
        minWidth: `${MIN_TARGET_PX}px`,
        minHeight: `${MIN_TARGET_PX}px`,
      }}
      /* Shares the `.glass-tile` surface and squircle radius with the dock icons,
         so the toggle reads as one more dock item. */
      className="glass-tile grid aspect-square shrink-0 place-items-center rounded-[28%] text-muted-foreground outline-none will-change-[width,height,transform] hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
    >
      {/* The glyph shows the theme this button will switch TO, not the one
          currently active: in dark mode you see a sun to reach for. `aria-pressed`
          still carries the actual state for assistive tech, so the affordance and
          the semantics do not contradict each other. */}
      {isLight ? MoonIcon : SunIcon}
    </button>
  );
});

export default ThemeToggle;
