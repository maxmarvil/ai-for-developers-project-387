import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GuestInput } from '@/api/client';
import { useClosedDates, useCreateBooking, useEventTypes, useSlots } from '@/api/hooks';
import { BookingApiError, errorMessage } from '@/api/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadGuest, saveGuest } from '@/lib/guest-storage';
import { EventTypePicker } from './EventTypePicker';
import { DatePicker } from './DatePicker';
import { SlotGrid } from './SlotGrid';
import { GuestForm } from './GuestForm';
import { useSlotSelection } from './useSlotSelection';

export function BookingPage() {
  const navigate = useNavigate();
  const eventTypesQuery = useEventTypes();
  const closedDatesQuery = useClosedDates();

  const [eventTypeId, setEventTypeId] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(null);

  const eventTypes = eventTypesQuery.data ?? [];
  const activeEventType = eventTypes.find((et) => et.id === eventTypeId) ?? null;
  const duration = activeEventType?.duration_minutes ?? 30;

  const slotsQuery = useSlots(eventTypeId, date);
  const createBooking = useCreateBooking();
  const slots = slotsQuery.data?.slots ?? [];
  const { selected, toggle, reset, totalSelectedMinutes, atLimit } = useSlotSelection(
    duration,
    slots,
  );

  // Reset the slot selection whenever the event type or date changes.
  useEffect(() => reset(), [eventTypeId, date, reset]);

  const closedDates = useMemo(
    () =>
      new Set((closedDatesQuery.data?.dates ?? []).filter((d) => d.is_closed).map((d) => d.date)),
    [closedDatesQuery.data],
  );

  const guest = useMemo(() => loadGuest(), []);

  function handleSubmit(input: GuestInput) {
    if (!eventTypeId || !date || selected.length === 0) return;
    createBooking.mutate(
      {
        event_type_id: eventTypeId,
        date,
        guest: input,
        slots: [...selected].sort().map((start) => ({ start })),
      },
      {
        onSuccess: (data) => {
          saveGuest({ name: input.name, email: input.email, phone: input.phone });
          navigate('/confirmation', {
            state: {
              bookingGroupId: data.booking_group_id,
              status: data.status,
              date,
              slots: [...selected].sort(),
              eventTypeName: activeEventType?.name,
            },
          });
        },
      },
    );
  }

  function renderApiError(error: unknown) {
    const code = error instanceof BookingApiError ? error.code : 'UNKNOWN';
    return (
      <p
        className="text-sm text-red-600"
        data-testid="api-error"
        data-error-code={code}
        role="alert"
      >
        {errorMessage(error)}
      </p>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Бронирование</h1>

      <Card>
        <CardHeader>
          <CardTitle>1. Тип события</CardTitle>
        </CardHeader>
        <CardContent>
          {eventTypesQuery.isLoading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
          {eventTypesQuery.isError && renderApiError(eventTypesQuery.error)}
          <EventTypePicker
            eventTypes={eventTypes}
            selectedId={eventTypeId}
            onSelect={setEventTypeId}
          />
        </CardContent>
      </Card>

      {eventTypeId != null && (
        <Card>
          <CardHeader>
            <CardTitle>2. Дата</CardTitle>
          </CardHeader>
          <CardContent>
            <DatePicker selectedDate={date} closedDates={closedDates} onSelect={setDate} />
          </CardContent>
        </Card>
      )}

      {eventTypeId != null && date && (
        <Card>
          <CardHeader>
            <CardTitle>3. Слоты</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {slotsQuery.isLoading && <p className="text-sm text-muted-foreground">Загрузка…</p>}
            {slotsQuery.isError && renderApiError(slotsQuery.error)}
            {slotsQuery.isSuccess && (
              <SlotGrid slots={slots} selected={selected} onToggle={toggle} />
            )}
            {selected.length > 0 && (
              <p className="text-sm text-muted-foreground" data-testid="selection-summary">
                Выбрано слотов: {selected.length} · {totalSelectedMinutes} мин
                {atLimit && ' (достигнут лимит 2 ч)'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(selected.length > 0 || createBooking.isError) && (
        <Card>
          <CardHeader>
            <CardTitle>4. Ваши данные</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {/* Keep form mounted after SLOT_TAKEN prune so guest input is not lost (UC-5). */}
            <GuestForm
              initial={guest}
              submitting={createBooking.isPending}
              onSubmit={handleSubmit}
            />
            {selected.length === 0 && createBooking.isError && (
              <p className="text-sm text-muted-foreground" data-testid="selection-cleared-hint">
                Выбранный слот больше недоступен. Выберите другой свободный слот.
              </p>
            )}
            {createBooking.isError && renderApiError(createBooking.error)}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
