/**
 * Pure motion-preference resolution.
 *
 * Kept free of DOM access so it is trivially unit-testable and can be reused by
 * both the animation engine and any component that needs to know what a motion
 * request will actually resolve to.
 */

/**
 * The kinds of motion an animation can request.
 *
 * `translate`, `scale`, `rotate`, and `parallax` are motion-based effects that
 * must be collapsed when a reduced-motion preference is set. `fade` is an
 * opacity-only effect that is preserved (but capped) under reduced motion.
 */
export type MotionKind = 'translate' | 'scale' | 'rotate' | 'parallax' | 'fade';

/** A requested animation, authored without regard to the visitor's preference. */
export interface MotionSpec {
  kind: MotionKind;
  startDelayMs: number;
  durationMs: number;
}

/**
 * The animation the engine will actually run.
 *
 * - `full`      run the requested motion as authored.
 * - `fade`      opacity-only transition, `durationMs` capped to <=200ms.
 * - `immediate` snap to the final state with `durationMs` === 0.
 */
export interface ResolvedMotion {
  mode: 'full' | 'fade' | 'immediate';
  durationMs: number;
  startDelayMs: number;
}

/** Maximum duration (ms) allowed for a fade-only transition under reduced motion. */
export const MAX_REDUCED_FADE_MS = 200;

/**
 * Resolves a requested {@link MotionSpec} against the visitor's reduced-motion
 * preference.
 *
 * Policy:
 * - No reduced-motion preference: the request passes through as `full`,
 *   preserving the authored duration and delay.
 * - Reduced motion set:
 *   - a `fade` spec collapses to a capped fade (`durationMs` = min(req, 200)),
 *     preserving the start delay;
 *   - every true-motion kind collapses to `immediate` (0ms, no delay).
 */
export function resolveMotion(
  spec: MotionSpec,
  prefersReducedMotion: boolean,
): ResolvedMotion {
  if (!prefersReducedMotion) {
    return {
      mode: 'full',
      durationMs: spec.durationMs,
      startDelayMs: spec.startDelayMs,
    };
  }

  if (spec.kind === 'fade') {
    return {
      mode: 'fade',
      durationMs: Math.max(0, Math.min(spec.durationMs, MAX_REDUCED_FADE_MS)),
      startDelayMs: spec.startDelayMs,
    };
  }

  return { mode: 'immediate', durationMs: 0, startDelayMs: 0 };
}
