import "./common.tsp";

namespace BookingCalendar;

/** Тип события — полное представление для администратора (включает неактивные). */
model AdminEventType {
  id: int32;
  name: string;
  description: string | null;

  duration_minutes: 15 | 30;

  color: string;
  is_active: boolean;
}

model CreateEventTypeRequest {
  @maxLength(255)
  name: string;

  description?: string | null;

  duration_minutes: 15 | 30;

  color: string;

  is_active?: boolean = true;
}

model UpdateEventTypeRequest {
  name?: string;
  description?: string | null;
  duration_minutes?: 15 | 30;
  color?: string;
  is_active?: boolean;
}

/** Регулярный интервал доступности по дню недели (FR-8). */
model AvailabilityRule {
  id: int32;

  /** День недели: 0 (воскресенье) — 6 (суббота). */
  @minValue(0)
  @maxValue(6)
  weekday: int32;

  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

model CreateAvailabilityRuleRequest {
  @minValue(0)
  @maxValue(6)
  weekday: int32;

  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

model UpdateAvailabilityRuleRequest {
  weekday?: int32;
  start_time?: TimeOfDay;
  end_time?: TimeOfDay;
}

/** Исключение из регулярной доступности — выходной день или частичное закрытие (FR-8). */
model AvailabilityException {
  id: int32;
  date: CalendarDate;
  is_closed: boolean;
  start_time: TimeOfDay | null;
  end_time: TimeOfDay | null;
}

model CreateAvailabilityExceptionRequest {
  date: CalendarDate;
  is_closed: boolean;
  start_time?: TimeOfDay | null;
  end_time?: TimeOfDay | null;
}

model UpdateAvailabilityExceptionRequest {
  date?: CalendarDate;
  is_closed?: boolean;
  start_time?: TimeOfDay | null;
  end_time?: TimeOfDay | null;
}

/** Гость — идентифицируется по email (D-1). */
model Guest {
  id: int32;
  email: string;
  name: string;
  phone: string;
}

/** Бронь — полное представление для администратора (FR-9). */
model AdminBooking {
  id: int32;
  event_type_id: int32;
  guest: Guest;

  /** Идентификатор группы брони, если бронь — часть длинной последовательной брони (FR-12). */
  booking_group_id: string | null;

  date: CalendarDate;
  start: TimeOfDay;
  end: TimeOfDay;
  comment: string | null;
  status: BookingStatus;
}

model AdminBookingListResponse {
  bookings: AdminBooking[];
}

/** Запрос на изменение статуса брони администратором (FR-10). Отмена/отклонение освобождает слот (BR-7). */
model UpdateBookingStatusRequest {
  status: BookingStatus;
}
