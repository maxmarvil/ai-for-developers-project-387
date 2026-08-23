import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Slot } from '@/api/client';
import { MAX_TOTAL_MINUTES, minutesBetween } from '@/lib/datetime';

/**
 * Manages selection of one or more *contiguous* slots of the same type (FR-12 / D-7)
 * with a client-side 2h cap hint (BR-1). The backend remains the source of truth.
 *
 * Rules enforced here:
 * - Selection must stay contiguous: only a slot adjacent to the current run can be added.
 * - Toggling a slot inside the run collapses the run down to that slot.
 * - Total duration may not exceed MAX_TOTAL_MINUTES.
 * - When slots refresh, non-free starts are dropped from selection (UC-5).
 */
export function useSlotSelection(durationMinutes: number, slots: Slot[] = []) {
  const [selected, setSelected] = useState<string[]>([]);

  const reset = useCallback(() => setSelected([]), []);

  useEffect(() => {
    if (slots.length === 0) return;
    const freeStarts = new Set(slots.filter((s) => s.status === 'free').map((s) => s.start));
    setSelected((prev) => {
      const next = prev.filter((start) => freeStarts.has(start));
      return next.length === prev.length ? prev : next;
    });
  }, [slots]);

  const toggle = useCallback(
    (slot: Slot) => {
      if (slot.status !== 'free') return;
      setSelected((prev) => {
        if (prev.length === 0) return [slot.start];

        const sorted = [...prev].sort();
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        // Deselect the current run's edge → shrink; otherwise start a new run.
        if (prev.includes(slot.start)) {
          if (slot.start === first || slot.start === last) {
            return prev.filter((s) => s !== slot.start);
          }
          return [slot.start];
        }

        // Extend only if adjacent to the run's start or end.
        const endOfLast = addByDuration(last, durationMinutes);
        const startBeforeFirst = addByDuration(slot.start, durationMinutes);
        const isAdjacent = slot.start === endOfLast || startBeforeFirst === first;
        if (!isAdjacent) return [slot.start];

        const next = [...prev, slot.start].sort();
        if (totalMinutes(next, durationMinutes) > MAX_TOTAL_MINUTES) return prev;
        return next;
      });
    },
    [durationMinutes],
  );

  const totalSelectedMinutes = useMemo(
    () => totalMinutes(selected, durationMinutes),
    [selected, durationMinutes],
  );

  const atLimit = totalSelectedMinutes >= MAX_TOTAL_MINUTES;

  return { selected, toggle, reset, totalSelectedMinutes, atLimit };
}

function totalMinutes(selected: string[], durationMinutes: number): number {
  return selected.length * durationMinutes;
}

function addByDuration(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export { minutesBetween };
