import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeToggle from './ThemeToggle';

/**
 * Tests for the theme toggle.
 *
 * The ref-forwarding test exists because of a real bug: the dock magnifies
 * whatever it holds a ref to, and the toggle originally exposed none, so it was
 * silently excluded from the effect while every icon beside it lifted.
 *
 * jsdom implements no `startViewTransition`, so these exercise the instant-swap
 * fallback path, which is also what unsupported browsers get.
 */

beforeEach(() => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add('dark');
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeToggle', () => {
  it('forwards its ref to the underlying button', () => {
    // The dock needs this node to include the toggle in pointer magnification.
    const ref = createRef<HTMLButtonElement>();
    render(<ThemeToggle ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('BUTTON');
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Toggle theme' }));
  });

  it('supports a callback ref as well as an object ref', () => {
    let captured: HTMLButtonElement | null = null;
    render(<ThemeToggle ref={(node) => { captured = node; }} />);

    expect(captured).not.toBeNull();
    expect(captured).toBe(screen.getByRole('button', { name: 'Toggle theme' }));
  });

  it('is sized so the dock can drive width and height directly', () => {
    // Magnification writes width/height; if only min-width were set the element
    // could never grow, which is what kept the toggle static.
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle theme' });

    expect(button.style.width).toBe('44px');
    expect(button.style.height).toBe('44px');
    // The minimums keep the touch target legal before the first frame runs.
    expect(button.style.minWidth).toBe('44px');
    expect(button.style.minHeight).toBe('44px');
  });

  it('adopts the theme already on the document', async () => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle theme' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  it('switches the document class when activated', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('persists the choice', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));

    await waitFor(() => {
      expect(localStorage.getItem('theme')).toBe('light');
    });
  });

  it('toggles back on a second activation', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: 'Toggle theme' });

    await user.click(button);
    await waitFor(() =>
      expect(document.documentElement.classList.contains('light')).toBe(true),
    );

    await user.click(button);
    await waitFor(() =>
      expect(document.documentElement.classList.contains('dark')).toBe(true),
    );
  });

  it('uses a view transition when the browser supports one', async () => {
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return {
        finished: Promise.resolve(),
        ready: Promise.resolve(),
        updateCallbackDone: Promise.resolve(),
        skipTransition() {},
      };
    });
    // @ts-expect-error assigning an optional API onto the test document
    document.startViewTransition = startViewTransition;

    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));

    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(1));
    expect(document.documentElement.classList.contains('light')).toBe(true);

    // Legal without a cast: the API is declared optional in src/types.
    delete document.startViewTransition;
  });

  it('still switches theme when localStorage throws', async () => {
    // Private-mode Safari historically threw on setItem; the toggle must survive.
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });

    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: 'Toggle theme' }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    setItem.mockRestore();
  });
});
