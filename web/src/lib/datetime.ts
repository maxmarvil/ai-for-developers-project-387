import { addDays, addMinutes, format, parse } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

/** Single source of truth for time rules (D-3, FR-13, FR-14, BR-5). */
export const APP_TIMEZONE = 'Europe/Moscow';

/** Booking horizon length in days (FR-13 / D-6). */
export const BOOKING_HORIZON_DAYS = 14;

/** Max total booked minutes per guest (BR-1). */
export const MAX_TOTAL_MINUTES = 120;

const DATE_FMT = 'yyyy-MM-dd';
const TIME_FMT = 'HH:mm';

/** Current date/time as seen in Europe/Moscow, regardless of the browser tz. */
export function nowInAppTz(): Date {
  return toZonedTime(new Date(), APP_TIMEZONE);
}

/** Today's calendar date string "YYYY-MM-DD" in the app timezone. */
export function todayIso(): string {
  return format(nowInAppTz(), DATE_FMT);
}

/**
 * Bookable dates: from tomorrow through the horizon (FR-14 excludes today;
 * FR-13 caps at 14 days ahead). Returns "YYYY-MM-DD" strings.
 */
export function bookableDates(): string[] {
  const base = nowInAppTz();
  const dates: string[] = [];
  for (let offset = 1; offset <= BOOKING_HORIZON_DAYS; offset += 1) {
    dates.push(format(addDays(base, offset), DATE_FMT));
  }
  return dates;
}

/** Whether a "YYYY-MM-DD" date is inside the bookable window (tomorrow..+14). */
export function isDateBookable(dateIso: string): boolean {
  return bookableDates().includes(dateIso);
}

/** Add `minutes` to a "HH:mm" time, returning "HH:mm". */
export function addMinutesToTime(time: string, minutes: number): string {
  const base = parse(time, TIME_FMT, new Date());
  return format(addMinutes(base, minutes), TIME_FMT);
}

/** Difference in minutes between two "HH:mm" times (end - start). */
export function minutesBetween(start: string, end: string): number {
  const s = parse(start, TIME_FMT, new Date());
  const e = parse(end, TIME_FMT, new Date());
  return Math.round((e.getTime() - s.getTime()) / 60_000);
}

/**
 * Whether `slots` (each with start/end "HH:mm") form a contiguous sequence,
 * i.e. every slot's end equals the next slot's start (D-7 / BR-4 client hint).
 * Assumes slots are already sorted by start.
 */
export function areSlotsSequential(slots: { start: string; end: string }[]): boolean {
  for (let i = 1; i < slots.length; i += 1) {
    if (slots[i - 1].end !== slots[i].start) return false;
  }
  return true;
}

/** Convert a "YYYY-MM-DD" + "HH:mm" (app tz) to an absolute UTC Date. */
export function toUtc(dateIso: string, time: string): Date {
  return fromZonedTime(`${dateIso}T${time}:00`, APP_TIMEZONE);
}

/** Format "YYYY-MM-DD" into a short human label, e.g. "пн, 17 авг". */
export function formatDateLabel(dateIso: string): string {
  const d = parse(dateIso, DATE_FMT, new Date());
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIMEZONE,
  }).format(d);
}
