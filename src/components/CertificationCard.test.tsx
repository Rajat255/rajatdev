import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import CertificationCard from './CertificationCard';

/**
 * Tests for the certification card island.
 *
 * The two behaviours worth locking down are the accessible structure (the badge
 * is reachable and correctly labelled whether or not a verify URL exists) and the
 * image-failure fallback, which must never leave a broken image on the page.
 */

const baseProps = {
  name: 'AWS Certified Cloud Practitioner',
  issuer: 'Amazon Web Services',
  date: 'Aug 2023',
  imageUrl: '/images/certs/awscp.png',
  altText: 'AWS Certified Cloud Practitioner badge',
};

describe('CertificationCard', () => {
  it('renders the badge image with its alt text', () => {
    render(<CertificationCard {...baseProps} />);
    expect(screen.getByAltText(baseProps.altText)).toBeInTheDocument();
  });

  it('always shows a text caption so the cert is identifiable', () => {
    render(<CertificationCard {...baseProps} />);
    expect(screen.getByText(baseProps.name)).toBeInTheDocument();
    expect(
      screen.getByText(`${baseProps.issuer} · ${baseProps.date}`),
    ).toBeInTheDocument();
  });

  it('becomes a labelled external link when a verify URL is given', () => {
    render(<CertificationCard {...baseProps} verifyUrl="https://example.com/verify" />);

    const link = screen.getByRole('link', {
      name: `${baseProps.name} — verify credential`,
    });
    expect(link).toHaveAttribute('href', 'https://example.com/verify');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('falls back to a focusable group when there is no verify URL', () => {
    render(<CertificationCard {...baseProps} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    const group = screen.getByRole('group', { name: baseProps.name });
    expect(group).toHaveAttribute('tabindex', '0');
  });

  it('swaps in a labelled fallback when the image fails to load', async () => {
    render(<CertificationCard {...baseProps} />);

    const img = screen.getByAltText(baseProps.altText);
    // Simulate the browser's error event for a missing asset. Wrapped in act so
    // the resulting state update is flushed before we assert.
    act(() => {
      img.dispatchEvent(new Event('error', { bubbles: false }));
    });

    // The broken <img> must be gone, replaced by a labelled fallback box.
    expect(
      screen.getByRole('img', { name: `${baseProps.name} — image unavailable` }),
    ).toBeInTheDocument();
    expect(screen.queryByAltText(baseProps.altText)).not.toBeInTheDocument();
    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
  });

  it('marks the frame as highlighted on hover', async () => {
    const user = userEvent.setup();
    render(<CertificationCard {...baseProps} />);

    const group = screen.getByRole('group', { name: baseProps.name });
    await user.hover(group);

    // The engine flags the frame so the CSS filter change applies even when the
    // scale motion is collapsed away under reduced motion.
    expect(group).toHaveAttribute('data-highlight', 'on');
  });
});
