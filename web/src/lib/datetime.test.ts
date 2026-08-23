import { describe, expect, test } from 'vitest';
import {
  APP_TIMEZONE,
  BOOKING_HORIZON_DAYS,
  MAX_TOTAL_MINUTES,
  addMinutesToTime,
  bookableDates,
  formatDateLabel,
  isDateBookable,
  minutesBetween,
  nowInAppTz,
  todayIso,
} from './datetime';

describe('datetime constants', () => {
  test('APP_TIMEZONE is Europe/Moscow (D-3)', () => {
    expect(APP_TIMEZONE).toBe('Europe/Moscow');
  });

  test('BOOKING_HORIZON_DAYS is 14 (FR-13, D-6)', () => {
    expect(BOOKING_HORIZON_DAYS).toBe(14);
  });

  test('MAX_TOTAL_MINUTES is 120 (BR-1)', () => {
    expect(MAX_TOTAL_MINUTES).toBe(120);
  });
});

describe('nowInAppTz / todayIso', () => {
  test('todayIso returns YYYY-MM-DD format', () => {
    const iso = todayIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('nowInAppTz returns a Date object', () => {
    const now = nowInAppTz();
    expect(now).toBeInstanceOf(Date);
  });
});

describe('bookableDates', () => {
  test('returns exactly BOOKING_HORIZON_DAYS dates', () => {
    const dates = bookableDates();
    expect(dates.length).toBe(BOOKING_HORIZON_DAYS);
  });

  test('excludes today (returns tomorrow+ through +14 days)', () => {
    const today = todayIso();
    const dates = bookableDates();
    expect(dates).not.toContain(today);
  });

  test('dates are consecutive', () => {
    const dates = bookableDates();
    for (let i = 1; i < dates.length; i++) {
      // Parse both dates and check that consecutive dates differ by exactly 1 day
      const prev = new Date(dates[i - 1] + 'T00:00:00');
      const curr = new Date(dates[i] + 'T00:00:00');
      const diffMs = curr.getTime() - prev.getTime();
      expect(diffMs).toBe(24 * 60 * 60 * 1000);
    }
  });

  test('all dates are in YYYY-MM-DD format', () => {
    const dates = bookableDates();
    dates.forEach((d) => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });
});

describe('isDateBookable', () => {
  test('returns true for all dates in bookableDates()', () => {
    const dates = bookableDates();
    dates.forEach((d) => expect(isDateBookable(d)).toBe(true));
  });

  test('returns false for today', () => {
    expect(isDateBookable(todayIso())).toBe(false);
  });

  test('returns false for a date far in the future', () => {
    const farFuture = '2100-01-01';
    expect(isDateBookable(farFuture)).toBe(false);
  });
});

describe('addMinutesToTime', () => {
  test('adds 15 minutes', () => {
    expect(addMinutesToTime('10:00', 15)).toBe('10:15');
  });

  test('adds 30 minutes', () => {
    expect(addMinutesToTime('10:00', 30)).toBe('10:30');
  });

  test('overflows hour boundary', () => {
    expect(addMinutesToTime('10:45', 30)).toBe('11:15');
  });

  test('overflows day boundary (wraps at 24h)', () => {
    expect(addMinutesToTime('23:50', 30)).toBe('00:20');
  });

  test('adds 0 minutes', () => {
    expect(addMinutesToTime('14:30', 0)).toBe('14:30');
  });
});

describe('minutesBetween', () => {
  test('difference of same time is 0', () => {
    expect(minutesBetween('10:00', '10:00')).toBe(0);
  });

  test('correctly calculates 15 minutes', () => {
    expect(minutesBetween('10:00', '10:15')).toBe(15);
  });

  test('correctly calculates 30 minutes', () => {
    expect(minutesBetween('10:00', '10:30')).toBe(30);
  });

  test('correctly calculates reverse order (negative)', () => {
    expect(minutesBetween('10:30', '10:00')).toBe(-30);
  });
});

describe('formatDateLabel', () => {
  test('returns a non-empty string', () => {
    const label = formatDateLabel('2025-08-17');
    expect(label).toBeTruthy();
    expect(typeof label).toBe('string');
  });

  test('label includes day and month in Russian short format', () => {
    const label = formatDateLabel('2025-08-17');
    // Should contain month name like "авг" for August
    expect(label).toContain('авг');
  });
});
