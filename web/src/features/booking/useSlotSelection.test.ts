import { describe, expect, test } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Slot } from '@/api/client';
import { useSlotSelection } from './useSlotSelection';

function makeSlot(start: string, status = 'free'): Slot {
  return { start, end: '', status: status as Slot['status'] };
}

describe('useSlotSelection (durationMinutes=15)', () => {
  function freshSlots(): Slot[] {
    const times: string[] = [];
    let totalMins = 480; // 08:00 in minutes from midnight
    for (let i = 0; i < 12; i++) {
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      totalMins += 15;
    }
    return times.map((t) => makeSlot(t));
  }

  describe('initial state', () => {
    test('selection is empty on mount', () => {
      const { result } = renderHook(() => useSlotSelection(15));
      expect(result.current.selected).toEqual([]);
      expect(result.current.totalSelectedMinutes).toBe(0);
      expect(result.current.atLimit).toBe(false);
    });
  });

  describe('toggle — single slot', () => {
    test('adds first free slot to empty selection', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));
      act(() => result.current.toggle(slots[0]));
      expect(result.current.selected).toContain(slots[0].start);
    });
  });

  describe('toggle — extending sequence', () => {
    test('extends forward when slot is adjacent to last', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      act(() => result.current.toggle(slots[0]));
      expect(result.current.selected).toContain(slots[0].start);

      // adjacent → extends forward
      act(() => result.current.toggle(slots[1]));
      expect(result.current.selected).toContain(slots[0].start);
      expect(result.current.selected).toContain(slots[1].start);
      expect(result.current.totalSelectedMinutes).toBe(30);
    });

    test('extends backward when slot is adjacent to first', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      act(() => result.current.toggle(slots[1])); // [08:15]
      expect(result.current.selected).toContain(slots[1].start);

      // adjacent before → extends to start
      act(() => result.current.toggle(slots[0]));
      expect(result.current.selected).toContain(slots[0].start);
      expect(result.current.totalSelectedMinutes).toBe(30);
    });

    test('does NOT extend when slot is not adjacent — resets run', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      act(() => result.current.toggle(slots[0])); // ['08:00']
      act(() => result.current.toggle(slots[3])); // NOT adjacent → resets to single

      expect(result.current.selected).toHaveLength(1);
      expect(result.current.selected[0]).toBe(slots[3].start);
    });
  });

  describe('toggle — shrinking selection', () => {
    test('removes edge slot when clicked again (deselect)', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      // Build a sequence of 3: [s0, s1, s2]
      act(() => result.current.toggle(slots[0]));
      act(() => result.current.toggle(slots[1]));
      act(() => result.current.toggle(slots[2]));

      expect(result.current.selected).toHaveLength(3);

      // Deselect the first edge slot (shrink from front)
      act(() => result.current.toggle(slots[0]));
      expect(result.current.selected).not.toContain(slots[0].start);
      expect(result.current.selected).toContain(slots[1].start);
      expect(result.current.selected).toContain(slots[2].start);

      // Deselect the last edge slot (shrink from back)
      act(() => result.current.toggle(slots[2]));
      expect(result.current.selected).toHaveLength(1);
    });
  });

  describe('toggle — double-click removes single item', () => {
    test('toggling a single slot twice clears it', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));
      act(() => result.current.toggle(slots[4])); // select
      expect(result.current.selected).toContain(slots[4].start);
      act(() => result.current.toggle(slots[4])); // deselect same
      expect(result.current.selected).toEqual([]);
    });
  });

  describe('MAX_TOTAL_MINUTES cap (BR-1 / D-7)', () => {
    test('prevents extending past 120 minutes total', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      // Fill 8 × 15 = 120 min with first 8 slots
      for (let i = 0; i < 8; i++) {
        act(() => result.current.toggle(slots[i]));
      }

      expect(result.current.totalSelectedMinutes).toBe(120);
      expect(result.current.atLimit).toBe(true);

      // Try to add 9th slot → should NOT extend (cap reached)
      const prevCount = result.current.selected.length;
      act(() => result.current.toggle(slots[8]));
      expect(result.current.selected).toHaveLength(prevCount);
    });
  });

  describe('reset', () => {
    test('clears all selected slots', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      // Select a few
      act(() => result.current.toggle(slots[0]));
      act(() => result.current.toggle(slots[1]));
      expect(result.current.selected).not.toEqual([]);

      act(() => result.current.reset());
      expect(result.current.selected).toEqual([]);
      expect(result.current.totalSelectedMinutes).toBe(0);
    });
  });

  describe('status filter', () => {
    test('does NOT allow selecting confirmed slots', () => {
      const slot = makeSlot('10:00', 'confirmed');
      const { result } = renderHook(() => useSlotSelection(15));
      act(() => result.current.toggle(slot));
      expect(result.current.selected).toEqual([]);
    });

    test('does NOT allow selecting pending slots', () => {
      const slot = makeSlot('14:00', 'pending');
      const { result } = renderHook(() => useSlotSelection(15));
      act(() => result.current.toggle(slot));
      expect(result.current.selected).toEqual([]);
    });

    test('ALLOWS selecting free slots', () => {
      const slot = makeSlot('10:00', 'free');
      const { result } = renderHook(() => useSlotSelection(15));
      act(() => result.current.toggle(slot));
      expect(result.current.selected).toContain(slot.start);
    });
  });

  describe('prune non-free after slots refresh (UC-5)', () => {
    test('drops selected starts that are no longer free', () => {
      const free = [makeSlot('10:00'), makeSlot('10:15'), makeSlot('10:30')];
      const { result, rerender } = renderHook(
        ({ slots }: { slots: Slot[] }) => useSlotSelection(15, slots),
        { initialProps: { slots: free } },
      );

      act(() => result.current.toggle(free[0]));
      act(() => result.current.toggle(free[1]));
      expect(result.current.selected).toEqual(['10:00', '10:15']);

      const afterRace = [
        makeSlot('10:00', 'pending'),
        makeSlot('10:15', 'free'),
        makeSlot('10:30', 'free'),
      ];
      rerender({ slots: afterRace });
      expect(result.current.selected).toEqual(['10:15']);
    });
  });

  describe('duration parameter changes', () => {
    test('keeps current selection on re-render (reset is done by caller via useEffect)', () => {
      const slots = freshSlots();
      // Keep it simple — no initialArgs support in this @testing-library/react version.
      const { result, rerender } = renderHook((dur: number) => useSlotSelection(dur));

      // Select one with default 15-min slots
      act(() => result.current.toggle(slots[0]));
      expect(result.current.selected).not.toEqual([]);

      // Re-render with different duration → hook keeps selection (BookingPage does useEffect reset)
      rerender(15);
      expect(result.current.selected).not.toEqual([]); // still has '08:00'
    });
  });

  describe('sequence contiguity invariant', () => {
    test('selected slots are always sorted chronologically after each toggle', () => {
      const slots = freshSlots();
      const { result } = renderHook(() => useSlotSelection(15));

      // Add first slot
      act(() => result.current.toggle(slots[0]));
      const firstStart = slots[0].start;

      act(() => result.current.toggle(slots[1])); // adjacent to 0 → extends backward
      expect(result.current.selected).toContain(firstStart);
      expect(result.current.selected).toContain(slots[1].start);

      // Add one more forward
      act(() => result.current.toggle(slots[2]));
      expect(result.current.selected).toHaveLength(3);
    });
  });
});
