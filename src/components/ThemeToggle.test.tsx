import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ThemeToggle from './ThemeToggle';

/**
 * Tests for the dark mode toggle.
 *
 * The light theme (`.light`) is the default, and the button is a toggle named
 * "dark mode" that is pressed while the dark theme is on.
 *
 * jsdom implements no `startViewTransition`, so most of these exercise the
 * instant-swap fallback path, which is also what unsupported browsers get.
 */

const NAME = 'dark mode';

beforeEach(() => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add('light');
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeToggle', () => {
  it('forwards its ref to the underlying button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ThemeToggle ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('BUTTON');
    expect(ref.current).toBe(screen.getByRole('button', { name: NAME }));
  });

  it('supports a callback ref as well as an object ref', () => {
    let captured: HTMLButtonElement | null = null;
    render(
      <ThemeToggle
        ref={(node) => {
          captured = node;
        }}
      />,
    );

    expect(captured).not.toBeNull();
    expect(captured).toBe(screen.getByRole('button', { name: NAME }));
  });

  it('keeps a 44px-tall touch target', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button', { name: NAME }).style.minHeight).toBe('44px');
  });

  it('is not pressed in the light theme', async () => {
    render(<ThemeToggle />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: NAME })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('adopts the dark theme already on the document', async () => {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: NAME })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('switches the document class when activated', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: NAME }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });

  it('persists the choice', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button', { name: NAME }));

    await waitFor(() => {
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  it('toggles back on a second activation', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: NAME });

    await user.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true));

    await user.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains('light')).toBe(true));
    expect(button).toHaveAttribute('aria-pressed', 'false');
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
    await user.click(screen.getByRole('button', { name: NAME }));

    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(1));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Legal without a cast: the API is declared optional in src/types.
    delete document.startViewTransition;
  });

  it('still switches theme when localStorage throws', async () => {
    // Private-mode Safari historically threw on setItem; the toggle must survive.
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button', { name: NAME }));

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    setItem.mockRestore();
  });
});
