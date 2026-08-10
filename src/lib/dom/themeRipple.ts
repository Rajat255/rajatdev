/**
 * themeRipple — circular reveal for theme changes.
 *
 * Uses the View Transitions API: the browser snapshots the page before and after
 * the theme class flips, and we animate a `clip-path: circle()` on the *new*
 * snapshot so the incoming theme wipes outward from the toggle button. The old
 * snapshot sits underneath, unanimated, and is progressively uncovered.
 *
 * This is a pure enhancement with three fallback paths, all of which swap the
 * theme instantly:
 *  - the browser has no `document.startViewTransition`;
 *  - the visitor prefers reduced motion (a full-viewport wipe is precisely the
 *    kind of large-area motion that preference is asking us to skip);
 *  - the transition itself throws.
 *
 * The DOM-touching parts take injected dependencies so the orchestration can be
 * unit-tested without a real View Transitions implementation.
 */

/** Origin and extent of the reveal circle, in CSS pixels. */
export interface RippleOrigin {
  x: number;
  y: number;
  /** Radius needed to cover the whole viewport from (x, y). */
  radius: number;
}

/** The subset of `DOMRect` this module needs. */
export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Computes the reveal circle for a trigger element.
 *
 * The circle starts at the trigger's centre and must grow until it covers every
 * corner of the viewport, otherwise the outgoing theme would remain visible in
 * whichever corner is furthest away. The radius is therefore the distance to the
 * furthest corner, which is why each axis takes the larger of its two distances.
 */
export function computeRippleOrigin(
  rect: RectLike,
  viewportWidth: number,
  viewportHeight: number,
): RippleOrigin {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  // Distance to the furthest edge on each axis, then the diagonal between them.
  const furthestX = Math.max(x, viewportWidth - x);
  const furthestY = Math.max(y, viewportHeight - y);

  return {
    x,
    y,
    // Guard against a zero radius (a zero-size viewport in tests/headless),
    // which would clip the new theme away entirely.
    radius: Math.max(1, Math.hypot(furthestX, furthestY)),
  };
}

/** Attribute set on <html> while a theme ripple is in flight. */
export const RIPPLE_ATTR = 'data-theme-transition';

/** Custom properties the keyframes read. */
export const RIPPLE_X_PROP = '--ripple-x';
export const RIPPLE_Y_PROP = '--ripple-y';
export const RIPPLE_RADIUS_PROP = '--ripple-r';

export interface RunThemeRippleOptions {
  /** Mutates the DOM to the new theme. Must be synchronous. */
  applyTheme: () => void;
  /** Reveal origin, or `null` to swap without a ripple. */
  origin: RippleOrigin | null;
  /** The <html> element. */
  root: HTMLElement;
  /** Document owning the view transition. */
  doc: Document;
  /** When true, skip the animation entirely. */
  reduceMotion: boolean;
}

/**
 * Applies a theme change, revealing it with a circular ripple where supported.
 *
 * Always resolves, and `applyTheme` is always called exactly once regardless of
 * which path is taken, so the theme can never fail to change.
 */
export async function runThemeRipple(options: RunThemeRippleOptions): Promise<void> {
  const { applyTheme, origin, root, doc, reduceMotion } = options;

  const startViewTransition = doc.startViewTransition?.bind(doc);

  // Any unsupported or unwanted case: swap instantly.
  if (reduceMotion || !startViewTransition || !origin) {
    applyTheme();
    return;
  }

  root.style.setProperty(RIPPLE_X_PROP, `${origin.x}px`);
  root.style.setProperty(RIPPLE_Y_PROP, `${origin.y}px`);
  root.style.setProperty(RIPPLE_RADIUS_PROP, `${origin.radius}px`);
  // Scopes the ripple keyframes, so any other view transition on the page keeps
  // the browser's default cross-fade.
  root.setAttribute(RIPPLE_ATTR, '');

  const cleanup = () => {
    root.removeAttribute(RIPPLE_ATTR);
    root.style.removeProperty(RIPPLE_X_PROP);
    root.style.removeProperty(RIPPLE_Y_PROP);
    root.style.removeProperty(RIPPLE_RADIUS_PROP);
  };

  try {
    const transition = startViewTransition(() => {
      applyTheme();
    });
    await transition.finished;
  } catch {
    // A failed transition must not leave the theme unchanged. `applyTheme` is
    // idempotent, so calling it again here is safe whether or not the callback
    // already ran.
    applyTheme();
  } finally {
    cleanup();
  }
}
