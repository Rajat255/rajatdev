/**
 * AnimationEngine — the single, testable facade for every animation on the site.
 *
 * Built on the Web Animations API and IntersectionObserver, both of which are
 * native. There is deliberately no animation library here: the site only needs
 * fade, translate, and scale, and a general-purpose timeline engine would cost
 * more in download than the animations are worth on a static portfolio.
 *
 * Every reveal, hover highlight, and entrance goes through this facade, which
 * enforces two cross-cutting rules in exactly one place:
 *
 *  1. Reduced-motion resolution. Before starting any animation the engine
 *     resolves the request against the visitor's LIVE `prefers-reduced-motion`
 *     setting via the pure {@link resolveMotion} function, so a mid-session
 *     preference change is respected.
 *
 *  2. Fallback-to-final-state. Reveal targets render their *final visible* CSS
 *     by default; the engine applies the entrance offset by JS ONLY once it has
 *     confirmed it is live. Every animation is wrapped so that a failure to
 *     start, a failure to finish, or a missing browser API snaps the target to
 *     fully visible with content and interactivity intact. Failures are logged
 *     to the console and never surfaced to the visitor.
 *
 * Testability: the reduced-motion lookup, the IntersectionObserver constructor,
 * and the failure logger are all injectable, so tests never need a real
 * `matchMedia` or a real observer.
 */

import { resolveMotion, type MotionSpec, type ResolvedMotion } from '@logic/resolveMotion';

// ---------------------------------------------------------------------------
// Final-state mechanism
// ---------------------------------------------------------------------------

/** Data attribute stamped on a target to expose its animation state. */
export const FINAL_STATE_ATTR = 'data-anim-state';
/** Value meaning "fully visible final state". */
export const FINAL_STATE_VALUE = 'final';
/** Value while the entrance offset is applied and the reveal is pending. */
export const INITIAL_STATE_VALUE = 'initial';
/** Value while a target is mid-animation. */
export const ANIMATING_STATE_VALUE = 'animating';

/**
 * Snaps a target to its fully visible final state with direct style writes, so
 * it stays correct even when the animation machinery is what failed. Clears the
 * entrance offset and blur, forces visibility, and stamps the final-state flag.
 * Never throws.
 */
export function markFinalVisibleState(target: HTMLElement): void {
  try {
    target.style.opacity = '1';
    target.style.transform = 'none';
    target.style.filter = 'none';
    target.style.visibility = 'visible';
    target.style.pointerEvents = '';
    target.removeAttribute('aria-hidden');
    target.setAttribute(FINAL_STATE_ATTR, FINAL_STATE_VALUE);
  } catch {
    /* Detached node; nothing more we can safely do. */
  }
}

/** True when the target has been flagged as fully visible. */
export function isInFinalVisibleState(target: HTMLElement): boolean {
  return target.getAttribute(FINAL_STATE_ATTR) === FINAL_STATE_VALUE;
}

// ---------------------------------------------------------------------------
// Interface & options
// ---------------------------------------------------------------------------

/** Options for a scroll-triggered reveal. */
export interface RevealOptions {
  startDelayMs: number;
  durationMs: number;
  motion: MotionSpec;
}

export interface AnimationEngine {
  /** Hero entrance; begins <200ms, completes <2000ms, ends fully visible. */
  heroEntrance(target: HTMLElement): void;
  /** Scroll-triggered entrance; ends visible; plays at most once per load. */
  reveal(target: HTMLElement, opts: RevealOptions): void;
  /** Applies a hover/focus highlight. */
  highlight(target: HTMLElement): void;
  /** Removes a hover/focus highlight. */
  removeHighlight(target: HTMLElement): void;
}

/** Minimal structural type for the IntersectionObserver constructor. */
export type ObserverFactory = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
) => IntersectionObserver;

/** Configuration + dependency injection. Every field is optional. */
export interface AnimationEngineConfig {
  /** Fixed reduced-motion value; overrides every other lookup (tests). */
  prefersReducedMotion?: boolean;
  /** Custom lookup for the LIVE reduced-motion preference. */
  reducedMotionQuery?: () => boolean;
  /** Inject the IntersectionObserver constructor (tests). */
  observerFactory?: ObserverFactory;
  /** Sink for suppressed failures. Defaults to `console.warn`. */
  logger?: (message: string, error: unknown) => void;
}

// ---------------------------------------------------------------------------
// Timing bounds & default motion specs
// ---------------------------------------------------------------------------

const HERO_MAX_START_MS = 200;
const HERO_MAX_DURATION_MS = 2000;
const REVEAL_MAX_START_MS = 200;
const REVEAL_MAX_DURATION_MS = 1000;
const HIGHLIGHT_MAX_DURATION_MS = 150;

/** Vertical entrance offset (px) for translate-based reveals. */
const ENTRANCE_OFFSET_PX = 24;
/** Soft focus-in blur (px), resolved to 0 as the target reveals. */
const ENTRANCE_BLUR_PX = 4;
/** Highlight scale factor applied on hover/focus. */
const HIGHLIGHT_SCALE = 1.04;

/** Fraction of the target that must be visible before a reveal fires. */
const REVEAL_THRESHOLD = 0.15;
/** Fires the reveal slightly before the target fully enters the viewport. */
const REVEAL_ROOT_MARGIN = '0px 0px -10% 0px';

const HERO_MOTION: MotionSpec = { kind: 'translate', startDelayMs: 80, durationMs: 800 };
const HIGHLIGHT_MOTION: MotionSpec = { kind: 'scale', startDelayMs: 0, durationMs: 120 };

/** Entrance easing: decelerating, so motion settles rather than stopping dead. */
const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_HIGHLIGHT = 'cubic-bezier(0.4, 0, 0.2, 1)';

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** True when the Web Animations API is usable on this element. */
function canAnimate(target: HTMLElement): boolean {
  return typeof target.animate === 'function';
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class PortfolioAnimationEngine implements AnimationEngine {
  private readonly fixedReducedMotion?: boolean;
  private readonly reducedMotionQuery?: () => boolean;
  private readonly observerFactory?: ObserverFactory;
  private readonly logger: (message: string, error: unknown) => void;

  /** Targets whose reveal is already scheduled — enforces once-per-load. */
  private readonly scheduledReveals = new WeakSet<HTMLElement>();
  /** Live highlight animations, so a revert can cancel the one in flight. */
  private readonly highlightAnimations = new WeakMap<HTMLElement, Animation>();

  constructor(config: AnimationEngineConfig = {}) {
    this.fixedReducedMotion = config.prefersReducedMotion;
    this.reducedMotionQuery = config.reducedMotionQuery;
    this.observerFactory = config.observerFactory;
    this.logger =
      config.logger ??
      ((message, error) => {
        console.warn(`[AnimationEngine] ${message}`, error);
      });
  }

  // -- Rule 1: live reduced-motion resolution -------------------------------

  private prefersReducedMotion(): boolean {
    if (this.fixedReducedMotion !== undefined) return this.fixedReducedMotion;
    if (this.reducedMotionQuery) return this.reducedMotionQuery();
    try {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    } catch (error) {
      this.logger('matchMedia lookup failed; assuming no reduced-motion', error);
    }
    return false;
  }

  private resolve(spec: MotionSpec): ResolvedMotion {
    return resolveMotion(spec, this.prefersReducedMotion());
  }

  // -- Rule 2: fallback-to-final-state wrapper ------------------------------

  /** Runs `work`; on ANY failure snaps every target to fully visible and logs. */
  private safeRun(targets: HTMLElement[], work: () => void): boolean {
    try {
      work();
      return true;
    } catch (error) {
      this.logger('animation failed; snapping target(s) to final state', error);
      for (const target of targets) markFinalVisibleState(target);
      return false;
    }
  }

  /**
   * Runs a keyframe animation and guarantees the target ends fully visible,
   * whether the animation finishes, is cancelled, or errors.
   */
  private animateToVisible(
    target: HTMLElement,
    keyframes: Keyframe[],
    durationMs: number,
    delayMs: number,
    easing: string,
  ): void {
    if (!canAnimate(target)) {
      // No Web Animations API: show the final state rather than nothing.
      markFinalVisibleState(target);
      return;
    }

    this.safeRun([target], () => {
      target.setAttribute(FINAL_STATE_ATTR, ANIMATING_STATE_VALUE);
      const animation = target.animate(keyframes, {
        duration: durationMs,
        delay: delayMs,
        easing,
        fill: 'both',
      });

      const settle = () => {
        // Commit the final state as inline styles, then drop the animation so it
        // never keeps overriding them.
        markFinalVisibleState(target);
        try {
          animation.cancel();
        } catch {
          /* Already finished or detached. */
        }
      };

      animation.addEventListener('finish', settle, { once: true });
      animation.addEventListener('cancel', settle, { once: true });

      // Safety net: if neither event ever fires, still land on the final state.
      const total = durationMs + delayMs + 50;
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          if (!isInFinalVisibleState(target)) markFinalVisibleState(target);
        }, total);
      }
    });
  }

  // -- Public API -----------------------------------------------------------

  heroEntrance(target: HTMLElement): void {
    const resolved = this.resolve(HERO_MOTION);

    if (resolved.mode === 'immediate') {
      markFinalVisibleState(target);
      return;
    }

    const delay = clamp(resolved.startDelayMs, 0, HERO_MAX_START_MS);
    const duration = clamp(resolved.durationMs, 0, HERO_MAX_DURATION_MS);

    // A reduced-motion fade is opacity-only; full motion adds translate + blur.
    const keyframes: Keyframe[] =
      resolved.mode === 'fade'
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            {
              opacity: 0,
              transform: `translateY(${ENTRANCE_OFFSET_PX}px)`,
              filter: `blur(${ENTRANCE_BLUR_PX}px)`,
            },
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
          ];

    this.animateToVisible(target, keyframes, duration, delay, EASE_OUT);
  }

  reveal(target: HTMLElement, opts: RevealOptions): void {
    // Once-per-load guarantee.
    if (this.scheduledReveals.has(target)) return;
    this.scheduledReveals.add(target);

    const resolved = this.resolve(opts.motion);

    // Reduced motion: no scroll choreography at all, just show the content.
    if (resolved.mode === 'immediate') {
      markFinalVisibleState(target);
      return;
    }

    const delay = clamp(resolved.startDelayMs, 0, REVEAL_MAX_START_MS);
    const duration = clamp(resolved.durationMs, 0, REVEAL_MAX_DURATION_MS);

    const keyframes: Keyframe[] =
      resolved.mode === 'fade'
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            {
              opacity: 0,
              transform: `translateY(${ENTRANCE_OFFSET_PX}px)`,
              filter: `blur(${ENTRANCE_BLUR_PX}px)`,
            },
            { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
          ];

    const makeObserver =
      this.observerFactory ??
      (typeof IntersectionObserver !== 'undefined'
        ? (cb: IntersectionObserverCallback, options?: IntersectionObserverInit) =>
            new IntersectionObserver(cb, options)
        : undefined);

    // No observer available: reveal immediately rather than leaving it hidden.
    if (!makeObserver) {
      this.animateToVisible(target, keyframes, duration, delay, EASE_OUT);
      return;
    }

    const ok = this.safeRun([target], () => {
      // Apply the pre-reveal state only now that we know we can observe and
      // animate. Until this point the target has been fully visible.
      target.style.opacity = '0';
      target.setAttribute(FINAL_STATE_ATTR, INITIAL_STATE_VALUE);

      const observer = makeObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            observer.disconnect();
            this.animateToVisible(target, keyframes, duration, delay, EASE_OUT);
          }
        },
        { threshold: REVEAL_THRESHOLD, rootMargin: REVEAL_ROOT_MARGIN },
      );

      observer.observe(target);
    });

    // safeRun already snapped the target visible on failure; nothing to add.
    if (!ok) return;
  }

  highlight(target: HTMLElement): void {
    const resolved = this.resolve(HIGHLIGHT_MOTION);
    // The flag drives a CSS filter change, so a visible transformation still
    // happens instantly even when the scale motion is collapsed away.
    target.setAttribute('data-highlight', 'on');

    if (resolved.mode !== 'full' || !canAnimate(target)) return;

    const duration = clamp(resolved.durationMs, 0, HIGHLIGHT_MAX_DURATION_MS);
    this.runHighlight(target, `scale(${HIGHLIGHT_SCALE})`, duration);
  }

  removeHighlight(target: HTMLElement): void {
    const resolved = this.resolve(HIGHLIGHT_MOTION);
    target.setAttribute('data-highlight', 'off');

    if (resolved.mode !== 'full' || !canAnimate(target)) return;

    const duration = clamp(resolved.durationMs, 0, HIGHLIGHT_MAX_DURATION_MS);
    this.runHighlight(target, 'scale(1)', duration);
  }

  /**
   * Animates a highlight transform, cancelling any highlight already in flight
   * on the same element so rapid hover in/out cannot leave it mid-scale.
   */
  private runHighlight(target: HTMLElement, transform: string, durationMs: number): void {
    this.safeRun([], () => {
      const previous = this.highlightAnimations.get(target);
      if (previous) {
        try {
          previous.cancel();
        } catch {
          /* Already gone. */
        }
      }

      const animation = target.animate(
        [{ transform: getComputedStyle(target).transform }, { transform }],
        { duration: durationMs, easing: EASE_HIGHLIGHT, fill: 'both' },
      );
      this.highlightAnimations.set(target, animation);
    });
  }
}

// ---------------------------------------------------------------------------
// Factory + lazy singleton
// ---------------------------------------------------------------------------

/** Creates a fresh {@link AnimationEngine}. Prefer this in tests. */
export function createAnimationEngine(
  config: AnimationEngineConfig = {},
): AnimationEngine {
  return new PortfolioAnimationEngine(config);
}

let singleton: AnimationEngine | null = null;

/**
 * Returns the shared production engine, created lazily on first use so importing
 * this module never touches `window` at import time.
 */
export function getAnimationEngine(): AnimationEngine {
  if (singleton === null) singleton = new PortfolioAnimationEngine();
  return singleton;
}
