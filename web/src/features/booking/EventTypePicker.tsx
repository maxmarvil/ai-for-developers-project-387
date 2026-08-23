import type { EventType } from '@/api/client';
import { cn } from '@/lib/cn';

interface Props {
  eventTypes: EventType[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

/** FR-2: choose the event type to book. */
export function EventTypePicker({ eventTypes, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Тип события">
      {eventTypes.map((et) => {
        const active = et.id === selectedId;
        return (
          <button
            key={et.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-testid={`event-type-${et.id}`}
            onClick={() => onSelect(et.id)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border hover:bg-muted',
            )}
          >
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: et.color }}
              aria-hidden
            />
            {et.name}
            <span className={cn('text-xs', active ? 'opacity-80' : 'text-muted-foreground')}>
              {et.duration_minutes} мин
            </span>
          </button>
        );
      })}
    </div>
  );
}
