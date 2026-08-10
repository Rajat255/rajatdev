import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FINAL_STATE_ATTR,
  FINAL_STATE_VALUE,
  createAnimationEngine,
  isInFinalVisibleState,
  markFinalVisibleState,
  type ObserverFactory,
} from './AnimationEngine';

/**
 * Tests for the animation facade.
 *
 * The contract worth guarding is not the visual detail but the resilience: no
 * matter what is missing or broken, a target must never be left invisible. These
 * tests drive each failure path deliberately.
 */

function makeTarget(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

/** A controllable IntersectionObserver stand-in. */
function makeObserverFactory() {
  const state: {
    callback?: IntersectionObserverCallback;
    observed: Element[];
    disconnected: boolean;
  } = { observed: [], disconnected: false };

  const factory: ObserverFactory = (cb) => {
    state.callback = cb;
    const observer = {
      observe: (el: Element) => void state.observed.push(el),
      unobserve: () => {},
      disconnect: () => {
        state.disconnected = true;
      },
      takeRecords: () => [],
      root: null,
      rootMargin: '',
      thresholds: [],
    } as unknown as IntersectionObserver;
    return observer;
  };

  /** Fires an intersection for the given element. */
  const trigger = (el: Element) => {
    state.callback?.(
      [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  };

  return { factory, state, trigger };
}

const revealOpts = {
  startDelayMs: 50,
  durationMs: 400,
  motion: { kind: 'translate' as const, startDelayMs: 50, durationMs: 400 },
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('markFinalVisibleState', () => {
  it('forces the element visible and flags it', () => {
    const el = makeTarget();
    el.style.opacity = '0';

    markFinalVisibleState(el);

    expect(el.style.opacity).toBe('1');
    expect(el.style.transform).toBe('none');
    expect(el.getAttribute(FINAL_STATE_ATTR)).toBe(FINAL_STATE_VALUE);
    expect(isInFinalVisibleState(el)).toBe(true);
  });
});

describe('reveal under a reduced-motion preference', () => {
  it('shows the target immediately and never observes', () => {
    const { factory, state } = makeObserverFactory();
    const engine = createAnimationEngine({
      prefersReducedMotion: true,
      observerFactory: factory,
    });
    const el = makeTarget();

    engine.reveal(el, revealOpts);

    expect(isInFinalVisibleState(el)).toBe(true);
    expect(state.observed).toHaveLength(0);
  });
});

describe('reveal with motion allowed', () => {
  it('hides the target, then reveals it on intersection', () => {
    const { factory, trigger } = makeObserverFactory();
    const engine = createAnimationEngine({
      prefersReducedMotion: false,
      observerFactory: factory,
    });
    const el = makeTarget();
    // jsdom has no Web Animations API by default; provide a controllable stub.
    const listeners: Record<string, () => void> = {};
    el.animate = vi.fn(
      () =>
        ({
          addEventListener: (type: string, cb: () => void) => {
            listeners[type] = cb;
          },
          cancel: () => {},
        }) as unknown as Animation,
    );

    engine.reveal(el, revealOpts);
    // Pre-reveal state is applied only once the engine knows it is live.
    expect(el.style.opacity).toBe('0');

    trigger(el);
    expect(el.animate).toHaveBeenCalledTimes(1);

    // Completing the animation commits the fully visible final state.
    listeners.finish?.();
    expect(isInFinalVisibleState(el)).toBe(true);
  });

  it('plays at most once per target', () => {
    const { factory, state } = makeObserverFactory();
    const engine = createAnimationEngine({
      prefersReducedMotion: false,
      observerFactory: factory,
    });
    const el = makeTarget();

    engine.reveal(el, revealOpts);
    engine.reveal(el, revealOpts);

    expect(state.observed).toHaveLength(1);
  });

  it('reveals immediately when there is no IntersectionObserver', () => {
    const engine = createAnimationEngine({
      prefersReducedMotion: false,
      // No observerFactory, and jsdom's global is removed for this test.
      observerFactory: undefined,
    });
    const original = globalThis.IntersectionObserver;
    // @ts-expect-error deliberately removing the global to drive the fallback
    delete globalThis.IntersectionObserver;

    const el = makeTarget();
    engine.reveal(el, revealOpts);

    // With no WAAPI either, the engine must land on the final visible state.
    expect(isInFinalVisibleState(el)).toBe(true);

    globalThis.IntersectionObserver = original;
  });

  it('snaps to visible and logs when observer setup throws', () => {
    const logger = vi.fn();
    const engine = createAnimationEngine({
      prefersReducedMotion: false,
      observerFactory: () => {
        throw new Error('observer boom');
      },
      logger,
    });
    const el = makeTarget();

    engine.reveal(el, revealOpts);

    expect(isInFinalVisibleState(el)).toBe(true);
    expect(logger).toHaveBeenCalled();
  });
});

describe('highlight', () => {
  it('flags the element so the CSS fallback applies', () => {
    const engine = createAnimationEngine({ prefersReducedMotion: false });
    const el = makeTarget();
    el.animate = vi.fn(() => ({ cancel: () => {} }) as unknown as Animation);

    engine.highlight(el);
    expect(el.getAttribute('data-highlight')).toBe('on');

    engine.removeHighlight(el);
    expect(el.getAttribute('data-highlight')).toBe('off');
  });

  it('sets the flag but runs no animation under reduced motion', () => {
    const engine = createAnimationEngine({ prefersReducedMotion: true });
    const el = makeTarget();
    el.animate = vi.fn(() => ({ cancel: () => {} }) as unknown as Animation);

    engine.highlight(el);

    expect(el.getAttribute('data-highlight')).toBe('on');
    expect(el.animate).not.toHaveBeenCalled();
  });
});

describe('heroEntrance', () => {
  it('shows the hero immediately under reduced motion', () => {
    const engine = createAnimationEngine({ prefersReducedMotion: true });
    const el = makeTarget();

    engine.heroEntrance(el);

    expect(isInFinalVisibleState(el)).toBe(true);
  });
});
