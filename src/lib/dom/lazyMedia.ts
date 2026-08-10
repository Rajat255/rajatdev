/**
 * lazyMedia — shared client utility for below-the-fold, non-critical media.
 *
 * Native `loading="lazy"` already defers offscreen images, but the browser's
 * lazy `rootMargin` is implementation-defined. This utility drives an
 * IntersectionObserver whose `rootMargin` is exactly one viewport height, and
 * promotes an element's real `src`/`srcset` from `data-src`/`data-srcset` only
 * once it enters that margin.
 *
 * Opt-in: only elements carrying `data-lazy` are managed here. Above-the-fold
 * critical media (the avatar) is never marked `data-lazy`.
 *
 * Resilience: if IntersectionObserver is unavailable or setup throws, every
 * managed element is promoted immediately so nothing stays unloaded. Elements
 * should also keep a native `loading="lazy"` hint as a second line of defense.
 */

/** Attribute marking a media element as managed by this loader. */
export const LAZY_ATTR = 'data-lazy';

/** `rootMargin` covering one viewport height above and below the viewport. */
export const ONE_VIEWPORT_ROOT_MARGIN = '100% 0px';

const DEFAULT_SELECTOR = `[${LAZY_ATTR}]`;

export interface InitLazyMediaOptions {
  /** Scroll root; defaults to the viewport (null). */
  root?: Element | Document | null;
  /** Override the trigger margin; defaults to one viewport height. */
  rootMargin?: string;
  /** Override the opt-in selector; defaults to `[data-lazy]`. */
  selector?: string;
  /** Scope to query; defaults to `document`. */
  scope?: Document | Element;
}

/**
 * Promote a single lazy element to its real source. Idempotent, and safe for
 * any element that uses `src`/`srcset` (`<img>`, `<source>`, `<video>`, ...).
 */
export function promoteLazyMedia(el: Element): void {
  // `srcset` is assigned before `src` so a responsive element can pick the best
  // candidate rather than eagerly fetching `src`.
  const dataSrcset = el.getAttribute('data-srcset');
  if (dataSrcset !== null) {
    el.setAttribute('srcset', dataSrcset);
    el.removeAttribute('data-srcset');
  }

  const dataSrc = el.getAttribute('data-src');
  if (dataSrc !== null) {
    el.setAttribute('src', dataSrc);
    el.removeAttribute('data-src');
  }

  el.removeAttribute(LAZY_ATTR);
  el.setAttribute('data-lazy-loaded', 'true');
}

/**
 * Promote every currently-matched lazy element immediately. Used as the
 * resilient fallback when IntersectionObserver is unavailable or setup fails.
 */
export function promoteAllLazyMedia(
  scope: Document | Element = document,
  selector: string = DEFAULT_SELECTOR,
): void {
  scope.querySelectorAll(selector).forEach((node) => promoteLazyMedia(node));
}

/**
 * Initialize lazy loading of below-the-fold non-critical media. Returns a
 * disposer that disconnects the observer.
 */
export function initLazyMedia(options: InitLazyMediaOptions = {}): () => void {
  const {
    root = null,
    rootMargin = ONE_VIEWPORT_ROOT_MARGIN,
    selector = DEFAULT_SELECTOR,
    scope = document,
  } = options;

  const noop = (): void => {};

  // No IntersectionObserver support: load everything now.
  if (typeof IntersectionObserver === 'undefined') {
    promoteAllLazyMedia(scope, selector);
    return noop;
  }

  try {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          promoteLazyMedia(entry.target);
          obs.unobserve(entry.target);
        }
      },
      { root, rootMargin, threshold: 0 },
    );

    scope.querySelectorAll(selector).forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  } catch {
    // Any failure wiring up the observer must not leave media unloaded.
    promoteAllLazyMedia(scope, selector);
    return noop;
  }
}
