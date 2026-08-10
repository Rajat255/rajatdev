// Global test setup: adds @testing-library/jest-dom matchers, provides a
// `matchMedia` stub (jsdom ships none, and both the animation engine and GSAP
// expect it), and cleans the DOM between tests.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  // jsdom does not implement matchMedia. Default every query to "does not
  // match", which means tests run on the full-motion, dark-theme path unless a
  // test overrides it. Individual tests can stub `window.matchMedia` to assert
  // reduced-motion behaviour.
  if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string): MediaQueryList =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          // Deprecated API, still probed by some libraries (including GSAP).
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    });
  }
});

afterEach(() => {
  cleanup();
});
