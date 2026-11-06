import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AgeCounter, { decimalAge, wheelOffset } from './AgeCounter';

/** 4 August 2001, 16:16 IST. */
const BORN = '2001-08-04T16:16:00+05:30';
const bornMs = Date.parse(BORN);

describe('decimalAge', () => {
  it('is zero at birth', () => {
    expect(decimalAge(bornMs, bornMs)).toBe(0);
  });

  it('is about 25.25 years on 3 November 2026', () => {
    const age = decimalAge(bornMs, Date.parse('2026-11-03T14:00:00+05:30'));
    expect(age).toBeGreaterThan(25.24);
    expect(age).toBeLessThan(25.26);
  });
});

describe('AgeCounter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-03T14:00:00+05:30'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a ticking odometer, and the birth date for screen readers', () => {
    const { container } = render(<AgeCounter bornAt={BORN} bornLabel="4 August 2001" />);
    const odometer = container.querySelector('[data-odometer]')!;
    const value = () => odometer.getAttribute('data-age') ?? '';

    // 2 whole-year wheels + 10 decimal wheels.
    expect(odometer.querySelectorAll('.overflow-hidden')).toHaveLength(12);
    expect(odometer.getAttribute('aria-hidden')).toBe('true');
    expect(container.textContent).toContain('years old');
    expect(container.querySelector('.sr-only')?.textContent).toBe('Born 4 August 2001');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(value()).toMatch(/^25\.\d{10}$/);
    const before = value();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(value()).not.toBe(before);
  });
});

describe('wheelOffset', () => {
  it('holds a slow wheel still until the wheel to its right finishes a turn', () => {
    // Ones wheel at 25.5 years: halfway through the year, nowhere near a roll.
    expect(wheelOffset(25.5, 1)).toBe(5);
  });

  it('rolls a wheel from 9 forward into the trailing 0', () => {
    const almost = 29 + 1 - 100 / (365.2425 * 24 * 60 * 60 * 1000); // 100 ms before 30
    const offset = wheelOffset(almost, 1);
    expect(offset).toBeGreaterThan(9);
    expect(offset).toBeLessThan(10);
  });

  it('spins the fastest wheels continuously', () => {
    const place = 1e-10; // about 3 ms per digit
    expect(wheelOffset(25.00000000042, place)).toBeCloseTo(4, 0);
  });
});
