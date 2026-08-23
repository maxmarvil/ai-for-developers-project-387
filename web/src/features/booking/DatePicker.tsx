import { bookableDates, formatDateLabel } from '@/lib/datetime';
import { cn } from '@/lib/cn';

interface Props {
  selectedDate: string | null;
  closedDates: Set<string>;
  onSelect: (date: string) => void;
}

/** FR-13/FR-14: horizontal picker of bookable days; fully closed dates are omitted (UC-7). */
export function DatePicker({ selectedDate, closedDates, onSelect }: Props) {
  const dates = bookableDates().filter((date) => !closedDates.has(date));
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="listbox" aria-label="Дата">
      {dates.map((date) => {
        const active = date === selectedDate;
        return (
          <button
            key={date}
            type="button"
            role="option"
            aria-selected={active}
            data-testid={`date-${date}`}
            onClick={() => onSelect(date)}
            className={cn(
              'min-w-[76px] shrink-0 rounded-md border px-3 py-2 text-center text-sm capitalize transition-colors',
              active && 'border-primary bg-primary text-primary-foreground',
              !active && 'border-border hover:bg-muted',
            )}
          >
            {formatDateLabel(date)}
          </button>
        );
      })}
    </div>
  );
}
