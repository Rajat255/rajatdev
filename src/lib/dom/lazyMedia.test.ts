import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  LAZY_ATTR,
  ONE_VIEWPORT_ROOT_MARGIN,
  initLazyMedia,
  promoteAllLazyMedia,
  promoteLazyMedia,
} from './lazyMedia';

/**
 * Tests for the lazy-media loader.
 *
 * The important guarantee here is resilience: whatever goes wrong, opt-in media
 * must never be left permanently unloaded.
 */

function makeImg(src = '/a.png', srcset?: string): HTMLImageElement {
  const img = document.createElement('img');
  img.setAttribute(LAZY_ATTR, '');
  img.setAttribute('data-src', src);
  if (srcset) img.setAttribute('data-srcset', srcset);
  document.body.appendChild(img);
  return img;
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('promoteLazyMedia', () => {
  it('moves data-src onto src and clears the lazy markers', () => {
    const img = makeImg('/hero.png');
    promoteLazyMedia(img);

    expect(img.getAttribute('src')).toBe('/hero.png');
    expect(img.hasAttribute('data-src')).toBe(false);
    expect(img.hasAttribute(LAZY_ATTR)).toBe(false);
    expect(img.getAttribute('data-lazy-loaded')).toBe('true');
  });

  it('promotes srcset as well as src', () => {
    const img = makeImg('/a.png', '/a.png 1x, /a@2x.png 2x');
    promoteLazyMedia(img);

    expect(img.getAttribute('srcset')).toBe('/a.png 1x, /a@2x.png 2x');
    expect(img.hasAttribute('data-srcset')).toBe(false);
  });

  it('is idempotent', () => {
    const img = makeImg('/a.png');
    promoteLazyMedia(img);
    promoteLazyMedia(img);

    expect(img.getAttribute('src')).toBe('/a.png');
  });
});

describe('promoteAllLazyMedia', () => {
  it('promotes every opt-in element', () => {
    makeImg('/one.png');
    makeImg('/two.png');

    promoteAllLazyMedia();

    expect(document.querySelectorAll(`[${LAZY_ATTR}]`)).toHaveLength(0);
    expect(document.querySelectorAll('img[src]')).toHaveLength(2);
  });
});

describe('initLazyMedia', () => {
  it('observes opt-in media with a one-viewport root margin', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    // Typed so `mock.calls` exposes the options argument we want to assert on.
    const ctor = vi.fn(
      (_cb: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
        void _cb;
        void options;
        return { observe, disconnect, unobserve: vi.fn() };
      },
    );
    vi.stubGlobal('IntersectionObserver', ctor);

    makeImg('/a.png');
    const dispose = initLazyMedia();

    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctor.mock.calls[0]?.[1]?.rootMargin).toBe(ONE_VIEWPORT_ROOT_MARGIN);
    expect(observe).toHaveBeenCalledTimes(1);

    dispose();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('promotes an element once it intersects', () => {
    type Cb = (entries: { isIntersecting: boolean; target: Element }[], obs: unknown) => void;
    let captured: Cb | undefined;
    const unobserve = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function (this: unknown, cb: Cb) {
        captured = cb;
        return { observe: vi.fn(), disconnect: vi.fn(), unobserve };
      }),
    );

    const img = makeImg('/late.png');
    initLazyMedia();

    captured?.([{ isIntersecting: true, target: img }], { unobserve });

    expect(img.getAttribute('src')).toBe('/late.png');
    expect(unobserve).toHaveBeenCalledWith(img);
  });

  it('loads everything immediately when IntersectionObserver is missing', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    const img = makeImg('/nofallback.png');
    initLazyMedia();

    expect(img.getAttribute('src')).toBe('/nofallback.png');
  });

  it('loads everything immediately when observer setup throws', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(() => {
        throw new Error('boom');
      }),
    );

    const img = makeImg('/throws.png');
    // Setup failure must be swallowed, not propagated to the caller.
    expect(() => initLazyMedia()).not.toThrow();
    expect(img.getAttribute('src')).toBe('/throws.png');
  });
});
