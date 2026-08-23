import type { Slot } from '@/api/client';
import { cn } from '@/lib/cn';

interface Props {
  slots: Slot[];
  /** Currently selected slot start times ("HH:mm"). */
  selected: string[];
  onToggle: (slot: Slot) => void;
}

/**
 * FR-1/FR-15: renders the availability grid. Free slots are selectable;
 * pending slots are visually distinguished from confirmed ones.
 */
export function SlotGrid({ slots, selected, onToggle }: Props) {
  if (slots.length === 0) {
    return <p className="text-sm text-muted-foreground">Нет доступных слотов на эту дату.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {slots.map((slot) => {
        const isSelected = selected.includes(slot.start);
        const isFree = slot.status === 'free';
        return (
          <button
            key={slot.start}
            type="button"
            disabled={!isFree}
            aria-pressed={isSelected}
            data-testid={`slot-${slot.start}`}
            data-status={slot.status}
            onClick={() => onToggle(slot)}
            className={cn(
              'rounded-md border px-2 py-2 text-sm tabular-nums transition-colors',
              isSelected && 'border-primary bg-primary text-primary-foreground',
              !isSelected && isFree && 'border-border hover:bg-muted',
              // Pending: dashed amber outline (FR-15 highlight vs confirmed).
              slot.status === 'pending' &&
                'cursor-not-allowed border-dashed border-amber-500 bg-amber-50 text-amber-700',
              slot.status === 'confirmed' &&
                'cursor-not-allowed border-border bg-muted text-muted-foreground',
            )}
          >
            {slot.start}
          </button>
        );
      })}
    </div>
  );
}
