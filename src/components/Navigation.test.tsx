import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Navigation from './Navigation';
import { navTargets } from '@content/navigation';
import { profile } from '@content/profile';

/**
 * Tests for the navigation dock island.
 *
 * The dock is the only global navigation on the page, so the contract that
 * matters is: every configured target is present and reachable, external links
 * are safely attributed, and every control meets the touch-target minimum.
 */

afterEach(() => {
  // The active-section test injects real <section> elements and stubs globals.
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('Navigation', () => {
  it('renders a link for every configured section target', () => {
    render(<Navigation />);

    for (const target of navTargets) {
      const link = screen.getByRole('link', { name: target.label });
      expect(link).toHaveAttribute('href', `#${target.sectionId}`);
    }
  });

  it('renders the social shortcuts from the profile layer', () => {
    render(<Navigation />);

    const linkedin = profile.socials.find((s) => s.name === 'LinkedIn');
    expect(linkedin).toBeDefined();
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      linkedin!.url,
    );
  });

  it('opens external links in a new tab with noopener', () => {
    render(<Navigation />);

    const linkedin = screen.getByRole('link', { name: 'LinkedIn' });
    expect(linkedin).toHaveAttribute('target', '_blank');
    expect(linkedin).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('keeps section links in-page (no target attribute)', () => {
    render(<Navigation />);

    const about = screen.getByRole('link', { name: 'About' });
    expect(about).not.toHaveAttribute('target');
  });

  it('exposes a labelled primary navigation landmark', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('includes the theme toggle as a button, not a nav target', () => {
    render(<Navigation />);
    expect(screen.getByRole('button', { name: 'Toggle theme' })).toBeInTheDocument();
  });

  it('sizes every dock icon to the 44px touch-target minimum', () => {
    render(<Navigation />);

    for (const link of screen.getAllByRole('link')) {
      // The resting size is written inline; magnification only ever grows it.
      expect(link.style.width).toBe('44px');
      expect(link.style.height).toBe('44px');
    }
  });

  it('marks the section in view with aria-current', async () => {
    // Drive the IntersectionObserver the active-section tracker relies on.
    type Cb = (entries: IntersectionObserverEntry[]) => void;
    let notify: Cb | undefined;
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn((cb: Cb) => {
        notify = cb;
        return {
          observe: () => {},
          unobserve: () => {},
          disconnect: () => {},
          takeRecords: () => [],
        } as unknown as IntersectionObserver;
      }),
    );

    // The tracker only observes sections that actually exist in the document.
    const projects = document.createElement('section');
    projects.id = 'projects';
    document.body.appendChild(projects);

    render(<Navigation />);

    await act(async () => {
      notify?.([
        {
          target: projects,
          isIntersecting: true,
          intersectionRatio: 0.9,
        } as unknown as IntersectionObserverEntry,
      ]);
    });

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    // Sections that are not in view must not claim to be current.
    expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute(
      'aria-current',
    );

    vi.unstubAllGlobals();
  });

  it('honours a custom target list', () => {
    render(<Navigation targets={[{ sectionId: 'contact', label: 'Reach me' }]} />);

    expect(screen.getByRole('link', { name: 'Reach me' })).toHaveAttribute(
      'href',
      '#contact',
    );
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
  });
});
