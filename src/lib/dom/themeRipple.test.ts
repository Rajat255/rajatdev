import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RIPPLE_ATTR,
  RIPPLE_RADIUS_PROP,
  RIPPLE_X_PROP,
  RIPPLE_Y_PROP,
  computeRippleOrigin,
  runThemeRipple,
} from './themeRipple';

/**
 * Tests for the theme ripple.
 *
 * The single most important guarantee is that the theme ALWAYS changes: the
 * animation is decoration, and no unsupported browser, motion preference, or
 * failed transition may leave the visitor stuck on the old theme.
 */

const VIEWPORT = { width: 1000, height: 800 };

function makeRoot(): HTMLElement {
  const el = document.createElement('html');
  document.body.appendChild(el);
  return el;
}

/** A `Document` stub exposing a controllable `startViewTransition`. */
function makeDoc(behaviour: 'resolve' | 'reject' | 'missing') {
  const calls: Array<() => void> = [];

  if (behaviour === 'missing') {
    return { doc: {} as Document, calls };
  }

  const doc = {
    startViewTransition(callback: () => void) {
      calls.push(callback);
      // The real API invokes the callback to capture the "after" state.
      callback();
      return {
        finished:
          behaviour === 'reject'
            ? Promise.reject(new Error('transition failed'))
            : Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      };
    },
  } as unknown as Document;

  return { doc, calls };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('computeRippleOrigin', () => {
  it('centres the circle on the trigger', () => {
    const origin = computeRippleOrigin(
      { left: 100, top: 200, width: 40, height: 40 },
      VIEWPORT.width,
      VIEWPORT.height,
    );
    expect(origin.x).toBe(120);
    expect(origin.y).toBe(220);
  });

  it('reaches the furthest corner from a corner trigger', () => {
    // Trigger at the top-left: the furthest corner is bottom-right.
    const origin = computeRippleOrigin(
      { left: 0, top: 0, width: 0, height: 0 },
      1000,
      800,
    );
    expect(origin.radius).toBeCloseTo(Math.hypot(1000, 800), 5);
  });

  it('reaches the furthest corner from a centred trigger', () => {
    const origin = computeRippleOrigin(
      { left: 500, top: 400, width: 0, height: 0 },
      1000,
      800,
    );
    // From the centre every corner is equidistant: half the diagonal.
    expect(origin.radius).toBeCloseTo(Math.hypot(500, 400), 5);
  });

  it('covers the whole viewport from any trigger position', () => {
    // The circle must reach all four corners, or the old theme would linger in
    // whichever corner is furthest away.
    for (const x of [0, 137, 500, 863, 1000]) {
      for (const y of [0, 91, 400, 709, 800]) {
        const origin = computeRippleOrigin(
          { left: x, top: y, width: 0, height: 0 },
          1000,
          800,
        );
        const corners: Array<[number, number]> = [
          [0, 0],
          [1000, 0],
          [0, 800],
          [1000, 800],
        ];
        for (const [cx, cy] of corners) {
          const distance = Math.hypot(cx - origin.x, cy - origin.y);
          expect(origin.radius).toBeGreaterThanOrEqual(distance - 1e-6);
        }
      }
    }
  });

  it('never returns a zero radius', () => {
    // A zero-size viewport would otherwise clip the incoming theme away entirely.
    const origin = computeRippleOrigin({ left: 0, top: 0, width: 0, height: 0 }, 0, 0);
    expect(origin.radius).toBeGreaterThan(0);
  });
});

describe('runThemeRipple', () => {
  const origin = { x: 120, y: 220, radius: 900 };

  it('runs the transition and applies the theme when supported', async () => {
    const root = makeRoot();
    const applyTheme = vi.fn();
    const { doc, calls } = makeDoc('resolve');

    await runThemeRipple({ applyTheme, origin, root, doc, reduceMotion: false });

    expect(calls).toHaveLength(1);
    expect(applyTheme).toHaveBeenCalledTimes(1);
  });

  it('exposes the ripple geometry to CSS during the transition', async () => {
    const root = makeRoot();
    const seen: Record<string, string> = {};
    const { doc } = makeDoc('resolve');

    await runThemeRipple({
      // The callback runs mid-transition, which is when the CSS must be able to
      // read the geometry.
      applyTheme: () => {
        seen.attr = root.hasAttribute(RIPPLE_ATTR) ? 'set' : 'unset';
        seen.x = root.style.getPropertyValue(RIPPLE_X_PROP);
        seen.y = root.style.getPropertyValue(RIPPLE_Y_PROP);
        seen.r = root.style.getPropertyValue(RIPPLE_RADIUS_PROP);
      },
      origin,
      root,
      doc,
      reduceMotion: false,
    });

    expect(seen.attr).toBe('set');
    expect(seen.x).toBe('120px');
    expect(seen.y).toBe('220px');
    expect(seen.r).toBe('900px');
  });

  it('cleans up the attribute and properties afterwards', async () => {
    const root = makeRoot();
    const { doc } = makeDoc('resolve');

    await runThemeRipple({
      applyTheme: () => {},
      origin,
      root,
      doc,
      reduceMotion: false,
    });

    expect(root.hasAttribute(RIPPLE_ATTR)).toBe(false);
    expect(root.style.getPropertyValue(RIPPLE_X_PROP)).toBe('');
    expect(root.style.getPropertyValue(RIPPLE_RADIUS_PROP)).toBe('');
  });

  it('swaps instantly when the API is unavailable', async () => {
    const root = makeRoot();
    const applyTheme = vi.fn();
    const { doc } = makeDoc('missing');

    await runThemeRipple({ applyTheme, origin, root, doc, reduceMotion: false });

    expect(applyTheme).toHaveBeenCalledTimes(1);
    // No transition means no scoping attribute should ever be set.
    expect(root.hasAttribute(RIPPLE_ATTR)).toBe(false);
  });

  it('swaps instantly under reduced motion, without a transition', async () => {
    const root = makeRoot();
    const applyTheme = vi.fn();
    const { doc, calls } = makeDoc('resolve');

    await runThemeRipple({ applyTheme, origin, root, doc, reduceMotion: true });

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it('swaps instantly when no origin could be measured', async () => {
    const root = makeRoot();
    const applyTheme = vi.fn();
    const { doc, calls } = makeDoc('resolve');

    await runThemeRipple({ applyTheme, origin: null, root, doc, reduceMotion: false });

    expect(applyTheme).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0);
  });

  it('still applies the theme when the transition rejects', async () => {
    const root = makeRoot();
    const applyTheme = vi.fn();
    const { doc } = makeDoc('reject');

    // Must not throw, and must not leave the theme unchanged.
    await expect(
      runThemeRipple({ applyTheme, origin, root, doc, reduceMotion: false }),
    ).resolves.toBeUndefined();

    expect(applyTheme).toHaveBeenCalled();
    expect(root.hasAttribute(RIPPLE_ATTR)).toBe(false);
  });
});
