import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import StatCounters from './StatCounters';
import { stats } from '@content/stats';

/**
 * Tests for the headline stat counters.
 *
 * The behaviour that matters is that the numbers actually count. This regressed
 * once already: a rewrite dropped `ref` off the `<dl>`, so `rootRef.current` was
 * null, the effect returned early, and the observer was never created. Nothing
 * threw and the final values still rendered, so the component looked correct in
 * every way except the one that was the point of it existing.
 *
 * Both the observer and the animation frames are driven by hand here rather than
 * through fake timers. jsdom's rAF does not advance its own timestamp when the
 * timer clock is advanced, so a timer-based test cannot exercise the easing at
 * all — it just sits on frame zero.
 */

/** Fires the captured IntersectionObserver callback for everything observed. */
let triggerIntersection: (() => void) | null = null;
let observedTargets: Element[] = [];

class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {
    triggerIntersection = () => {
      const entries = observedTargets.map(
        (target) =>
          ({
            target,
            isIntersecting: true,
            intersectionRatio: 1,
          }) as unknown as IntersectionObserverEntry,
      );
      this.callback(entries, this as unknown as IntersectionObserver);
    };
  }

  observe(target: Element) {
    observedTargets.push(target);
  }
  unobserve(target: Element) {
    observedTargets = observedTargets.filter((t) => t !== target);
  }
  disconnect() {
    observedTargets = [];
  }
  takeRecords() {
    return [];
  }
}

let rafQueue: FrameRequestCallback[] = [];

/** Runs one animation frame at the given timestamp. */
const frame = (timestampMs: number) => {
  const queue = rafQueue;
  rafQueue = [];
  act(() => {
    for (const cb of queue) cb(timestampMs);
  });
};

/** Reads the rendered number spans in document order. */
const renderedValues = (): string[] =>
  screen
    .getAllByRole('definition')
    .map((dd) => dd.querySelector('span')?.textContent?.trim() ?? '');

const finalValues = stats.map((s) => `${s.prefix ?? ''}${s.value}${s.suffix ?? ''}`);
const zeroValues = stats.map((s) => `${s.prefix ?? ''}0${s.suffix ?? ''}`);

const setReducedMotion = (reduce: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

beforeEach(() => {
  observedTargets = [];
  triggerIntersection = null;
  rafQueue = [];

  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
  setReducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('StatCounters', () => {
  it('renders the real values on first paint, before any animation', () => {
    render(<StatCounters />);
    expect(renderedValues()).toEqual(finalValues);
  });

  it('observes the element it renders', () => {
    render(<StatCounters />);

    // The regression that motivated this file: nothing was observed, because the
    // ref never reached the DOM node.
    expect(observedTargets).toHaveLength(1);
    expect(observedTargets[0]?.tagName).toBe('DL');
  });

  it('rewinds to zero when the row scrolls into view', () => {
    render(<StatCounters />);

    act(() => {
      triggerIntersection?.();
    });

    // Prefixes and suffixes are static; only the number rewinds.
    expect(renderedValues()).toEqual(zeroValues);
  });

  it('counts upward across frames without overshooting', () => {
    render(<StatCounters />);
    act(() => {
      triggerIntersection?.();
    });

    frame(0);
    frame(400);
    const mid = renderedValues();

    // Mid-flight the numbers must be strictly between zero and the target.
    expect(mid).not.toEqual(zeroValues);
    expect(mid).not.toEqual(finalValues);
  });

  it('lands exactly on the final values when the animation completes', () => {
    render(<StatCounters />);
    act(() => {
      triggerIntersection?.();
    });

    frame(0);
    frame(700);
    // Past the 1400ms duration, so the run finalizes.
    frame(2000);

    expect(renderedValues()).toEqual(finalValues);
  });

  it('never renders a negative number, even on a stalled first frame', () => {
    render(<StatCounters />);
    act(() => {
      triggerIntersection?.();
    });

    // A timestamp behind the start would drive the easing negative if `t` were
    // not clamped at the low end.
    frame(5000);
    frame(0);

    for (const value of renderedValues()) {
      expect(value).not.toContain('-');
    }
  });

  it('counts only once, so scrolling back does not replay it', () => {
    render(<StatCounters />);
    act(() => {
      triggerIntersection?.();
    });
    frame(0);
    frame(2000);

    const settled = renderedValues();
    expect(settled).toEqual(finalValues);

    act(() => {
      triggerIntersection?.();
    });
    expect(renderedValues()).toEqual(settled);
  });

  it('skips the count-up entirely under reduced motion', () => {
    setReducedMotion(true);
    render(<StatCounters />);

    expect(observedTargets).toHaveLength(0);
    expect(renderedValues()).toEqual(finalValues);
  });
});
