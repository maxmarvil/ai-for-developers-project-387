import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CreateBookingRequest } from './client';
import { BookingApiError } from './errors';

export const queryKeys = {
  eventTypes: ['event-types'] as const,
  closedDates: ['closed-dates'] as const,
  slots: (eventTypeId: number, date: string) => ['slots', eventTypeId, date] as const,
  guestBookings: (email: string, date: string) => ['guest-bookings', email, date] as const,
};

/** FR-2: list of active event types available for booking. */
export function useEventTypes() {
  return useQuery({
    queryKey: queryKeys.eventTypes,
    queryFn: async () => {
      const { data, error } = await api.GET('/event-types');
      if (error) throw new BookingApiError(undefined, 'Не удалось загрузить типы событий');
      return data;
    },
  });
}

/** Dates fully/partially closed within the horizon (FR-8 exceptions). */
export function useClosedDates() {
  return useQuery({
    queryKey: queryKeys.closedDates,
    queryFn: async () => {
      const { data, error } = await api.GET('/closed-dates');
      if (error) throw new BookingApiError(undefined, 'Не удалось загрузить закрытые даты');
      return data;
    },
  });
}

/** FR-1: availability slots for a given event type and date. */
export function useSlots(eventTypeId: number | null, date: string | null) {
  return useQuery({
    queryKey: queryKeys.slots(eventTypeId ?? -1, date ?? ''),
    enabled: eventTypeId != null && !!date,
    queryFn: async () => {
      const { data, error } = await api.GET('/slots', {
        params: { query: { event_type_id: eventTypeId!, date: date! } },
      });
      if (error) throw new BookingApiError(error, 'День закрыт или недоступен');
      return data;
    },
  });
}

/** Guest's bookings for a date (by email) — used for the 2h limit hint (BR-1). */
export function useGuestBookings(email: string | null, date: string | null) {
  return useQuery({
    queryKey: queryKeys.guestBookings(email ?? '', date ?? ''),
    enabled: !!email && !!date,
    queryFn: async () => {
      const { data, error } = await api.GET('/guest-bookings', {
        params: { query: { email: email!, date: date! } },
      });
      if (error) throw new BookingApiError(undefined, 'Не удалось загрузить брони гостя');
      return data;
    },
  });
}

/** FR-3/FR-12: create one or more sequential slot bookings. */
export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateBookingRequest) => {
      const { data, error } = await api.POST('/bookings', { body });
      if (error) throw new BookingApiError(error, 'Не удалось создать бронь');
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.slots(variables.event_type_id, variables.date),
      });
      qc.invalidateQueries({ queryKey: ['guest-bookings'] });
    },
    onError: (error, variables) => {
      // UC-5: refresh grid so the taken slot shows as pending/confirmed.
      if (error instanceof BookingApiError && error.code === 'SLOT_TAKEN') {
        qc.invalidateQueries({
          queryKey: queryKeys.slots(variables.event_type_id, variables.date),
        });
      }
    },
  });
}
