import { describe, expect, test } from 'vitest';
import type { Slot } from '@/api/client';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlotGrid } from './SlotGrid';

function makeSlots(count: number): Slot[] {
  return Array.from({ length: count }, (_, i) => ({
    start: `${String(i).padStart(2, '0')}:00`,
    end: `${String(i).padStart(2, '0')}:30`,
    status: 'free' as const,
  }));
}

describe('SlotGrid', () => {
  describe('rendering', () => {
    test('renders a grid of slots', () => {
      render(<SlotGrid slots={makeSlots(6)} selected={[]} onToggle={() => {}} />);
      expect(screen.getAllByRole('button')).toHaveLength(6);
    });

    test('shows "No available slots" message when empty', () => {
      render(<SlotGrid slots={[]} selected={[]} onToggle={() => {}} />);
      expect(screen.getByText('Нет доступных слотов на эту дату.')).toBeInTheDocument();
    });

    test('each slot button displays its start time', () => {
      const slots = makeSlots(4);
      render(<SlotGrid slots={slots} selected={[]} onToggle={() => {}} />);
      slots.forEach((s) => expect(screen.getByText(s.start)).toBeInTheDocument());
    });

    test('buttons have correct aria-pressed state', () => {
      const slots = makeSlots(4);
      render(<SlotGrid slots={slots} selected={['01:00']} onToggle={() => {}} />);
      expect(screen.getByRole('button', { name: '01:00' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('unselected slot has aria-pressed false', () => {
      const slots = makeSlots(4);
      render(<SlotGrid slots={slots} selected={['01:00']} onToggle={() => {}} />);
      expect(screen.getByRole('button', { name: '02:00' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
  });

  describe('slot statuses', () => {
    test('free slot is selectable (not disabled)', () => {
      const slots = makeSlots(2);
      render(<SlotGrid slots={slots} selected={[]} onToggle={(s) => void s} />);
      const btn = screen.getByRole('button', { name: '00:00' });
      expect(btn).not.toBeDisabled();
    });

    test('free slot has correct data-status attribute', () => {
      const slots = [{ start: '10:00', end: '10:30', status: 'free' as const }];
      render(<SlotGrid slots={slots} selected={[]} onToggle={() => {}} />);
      expect(screen.getByText('10:00')).toHaveAttribute('data-status', 'free');
    });

    test('pending slot shows data-status=pending', () => {
      const slots = [{ start: '10:00', end: '10:30', status: 'pending' as const }];
      render(<SlotGrid slots={slots} selected={[]} onToggle={() => {}} />);
      expect(screen.getByText('10:00')).toHaveAttribute('data-status', 'pending');
    });

    test('confirmed slot shows data-status=confirmed', () => {
      const slots = [{ start: '14:00', end: '14:30', status: 'confirmed' as const }];
      render(<SlotGrid slots={slots} selected={[]} onToggle={() => {}} />);
      expect(screen.getByText('14:00')).toHaveAttribute('data-status', 'confirmed');
    });

    test('non-free slots are disabled', () => {
      const pendingSlot = { start: '10:00', end: '10:30', status: 'pending' as const };
      render(<SlotGrid slots={[pendingSlot]} selected={[]} onToggle={() => {}} />);
      expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled();
    });

    test('confirmed slot is disabled', () => {
      const confirmedSlot = { start: '14:00', end: '14:30', status: 'confirmed' as const };
      render(<SlotGrid slots={[confirmedSlot]} selected={[]} onToggle={() => {}} />);
      expect(screen.getByRole('button', { name: '14:00' })).toBeDisabled();
    });

    test('selectable slot is not disabled', () => {
      const freeSlots = makeSlots(3);
      render(<SlotGrid slots={freeSlots} selected={[]} onToggle={() => {}} />);
      freeSlots.forEach(() => {});
      expect(screen.getByRole('button', { name: '00:00' })).not.toBeDisabled();
    });
  });

  describe('selection feedback', () => {
    test('calls onToggle with correct slot when clicked', async () => {
      const slots = makeSlots(3);
      const toggleFn = vi.fn();
      const user = userEvent.setup();
      render(<SlotGrid slots={slots} selected={[]} onToggle={toggleFn} />);

      await user.click(screen.getByRole('button', { name: '01:00' }));
      expect(toggleFn).toHaveBeenCalledTimes(1);
      const calledWith = toggleFn.mock.calls[0][0];
      expect(calledWith.start).toBe('01:00');
    });

    test('selected slot is highlighted (aria-pressed=true)', () => {
      const slots = makeSlots(3);
      render(<SlotGrid slots={slots} selected={['02:00']} onToggle={() => {}} />);
      expect(screen.getByRole('button', { name: '02:00' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('non-selected slot has aria-pressed=false', () => {
      const slots = makeSlots(3);
      render(<SlotGrid slots={slots} selected={['01:00']} onToggle={() => {}} />);
      expect(screen.getByRole('button', { name: '00:00' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });

    test('invokes callback with slot matching start time', async () => {
      const slots = makeSlots(3);
      const toggleFn = vi.fn();
      const user = userEvent.setup();
      render(<SlotGrid slots={slots} selected={['01:00']} onToggle={toggleFn} />);

      await user.click(screen.getByRole('button', { name: '02:00' }));
      expect(toggleFn).toHaveBeenCalledWith(expect.objectContaining({ start: '02:00' }));
    });
  });
});
