import { describe, expect, it } from 'vitest';

import {
  MAX_REDUCED_FADE_MS,
  resolveMotion,
  type MotionKind,
  type MotionSpec,
} from './resolveMotion';

/**
 * Tests for the pure motion-preference resolution.
 *
 * These pin down the accessibility contract the animation engine relies on: with
 * a reduced-motion preference set, no true-motion effect may survive, and a fade
 * may never outlast the cap.
 */

const MOTION_KINDS: MotionKind[] = ['translate', 'scale', 'rotate', 'parallax'];

const spec = (kind: MotionKind, durationMs = 800, startDelayMs = 100): MotionSpec => ({
  kind,
  durationMs,
  startDelayMs,
});

describe('resolveMotion without a reduced-motion preference', () => {
  it('passes the request through unchanged', () => {
    const resolved = resolveMotion(spec('translate', 900, 120), false);
    expect(resolved).toEqual({ mode: 'full', durationMs: 900, startDelayMs: 120 });
  });

  it('preserves a fade as authored', () => {
    const resolved = resolveMotion(spec('fade', 1200, 50), false);
    expect(resolved.mode).toBe('full');
    expect(resolved.durationMs).toBe(1200);
  });
});

describe('resolveMotion with a reduced-motion preference', () => {
  it.each(MOTION_KINDS)('collapses %s to an immediate transition', (kind) => {
    const resolved = resolveMotion(spec(kind), true);
    expect(resolved).toEqual({ mode: 'immediate', durationMs: 0, startDelayMs: 0 });
  });

  it('caps a fade at the maximum reduced-fade duration', () => {
    const resolved = resolveMotion(spec('fade', 5000, 40), true);
    expect(resolved.mode).toBe('fade');
    expect(resolved.durationMs).toBe(MAX_REDUCED_FADE_MS);
    // The delay is preserved so a staggered fade still reads as staggered.
    expect(resolved.startDelayMs).toBe(40);
  });

  it('leaves a fade shorter than the cap untouched', () => {
    const resolved = resolveMotion(spec('fade', 120, 0), true);
    expect(resolved.durationMs).toBe(120);
  });

  it('never returns a duration above the cap for any kind', () => {
    const kinds: MotionKind[] = [...MOTION_KINDS, 'fade'];
    for (const kind of kinds) {
      const resolved = resolveMotion(spec(kind, 10_000, 500), true);
      expect(resolved.durationMs).toBeLessThanOrEqual(MAX_REDUCED_FADE_MS);
    }
  });
});
