import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AgeCounter, { ageBetween } from './AgeCounter';

/** 4 August 2001, 16:16 IST. */
const BORN = '2001-08-04T16:16:00+05:30';
const bornMs = Date.parse(BORN);
const IST = 330;

describe('ageBetween', () => {
  it('is zero at the moment of birth', () => {
    expect(ageBetween(bornMs, bornMs, IST)).toEqual({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('turns a year older at exactly 16:16 IST on the birthday', () => {
    const justBefore = Date.parse('2026-08-04T16:15:59+05:30');
    const exactly = Date.parse('2026-08-04T16:16:00+05:30');
    expect(ageBetween(bornMs, justBefore, IST).years).toBe(24);
    expect(ageBetween(bornMs, exactly, IST)).toMatchObject({ years: 25, months: 0, days: 0, hours: 0 });
  });

  it('borrows days and months correctly across a month end', () => {
    // 3 Nov 2026, 14:00 IST: 25 years, 2 months, 29 days (Oct has 31), 21h 44m.
    const now = Date.parse('2026-11-03T14:00:00+05:30');
    expect(ageBetween(bornMs, now, IST)).toEqual({
      years: 25,
      months: 2,
      days: 29,
      hours: 21,
      minutes: 44,
      seconds: 0,
    });
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

  it('shows the age and ticks every second', () => {
    const { container } = render(<AgeCounter bornAt={BORN} />);
    const text = () => container.querySelector('p')?.textContent ?? '';

    expect(text()).toBe('25 years, 2 months, 29 days, 21 hours, 44 minutes and 0 seconds old.');
    expect(screen.getByText('25 years')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(text()).toBe('25 years, 2 months, 29 days, 21 hours, 44 minutes and 3 seconds old.');
  });
});
