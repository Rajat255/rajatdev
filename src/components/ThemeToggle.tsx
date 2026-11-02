/**
 * ThemeToggle — the "dark mode" switch in the footer (React island).
 *
 * Swaps the `.dark`/`.light` class on <html> and persists the choice to
 * localStorage under the `theme` key. The initial class is set synchronously by
 * the no-flash script in BaseLayout.astro; this island adopts that class on
 * mount and stays in sync, so there is never a flash and first paint never
 * depends on hydration.
 *
 * The swap is wrapped in a View Transition so the new theme spreads outward
 * from this button (see `lib/dom/themeRipple.ts`). That is a pure enhancement:
 * where the API is missing, or the visitor prefers reduced motion, the theme
 * changes instantly instead.
 *
 * Semantics: a toggle button named by its visible text, "dark mode", and
 * pressed while the dark theme is on. The small circle beside the text is
 * filled by CSS (`dark:` variant) from the class on <html>, so it is right on
 * the very first frame, before hydration.
 *
 * Accessibility: a native <button>, full keyboard operability, and a 44px-tall
 * activation target.
 */
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { computeRippleOrigin, runThemeRipple } from '../lib/dom/themeRipple';

type Theme = 'light' | 'dark';

/** Minimum touch-target height in CSS pixels. */
const MIN_TARGET_PX = 44;

/**
 * Forwards the underlying <button> so a parent can measure or focus it. The
 * component keeps its own internal ref as well, for measuring the ripple origin,
 * so the two are merged in the ref callback below.
 */
const ThemeToggle = forwardRef<HTMLButtonElement>(function ThemeToggle(_props, forwardedRef) {
  // `null` until mounted so render never reads the DOM.
  const [theme, setTheme] = useState<Theme | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // Guards against a second click landing mid-transition, which would snapshot
  // the page while the previous ripple was still running.
  const transitioningRef = useRef(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }, []);

  const toggle = useCallback(async () => {
    if (transitioningRef.current) return;

    const root = document.documentElement;
    const next: Theme = root.classList.contains('dark') ? 'light' : 'dark';

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
    const origin = rect ? computeRippleOrigin(rect, window.innerWidth, window.innerHeight) : null;

    transitioningRef.current = true;
    try {
      await runThemeRipple({ applyTheme, origin, root, doc: document, reduceMotion });
    } finally {
      transitioningRef.current = false;
      // Read the class back rather than trusting `next`, so the state reflects
      // the DOM even if something else changed it meanwhile.
      setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    }
  }, []);

  return (
    <button
      ref={(node) => {
        buttonRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      type="button"
      onClick={toggle}
      aria-pressed={theme === 'dark'}
      style={{ minHeight: `${MIN_TARGET_PX}px` }}
      className="inline-flex shrink-0 items-center gap-2 px-1 italic text-muted transition-colors hover:text-accent"
    >
      {/* Empty by day, filled at night. */}
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-current dark:border-accent dark:bg-accent" />
      dark mode
    </button>
  );
});

export default ThemeToggle;
