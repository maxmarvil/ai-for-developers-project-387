import "./common.tsp";

namespace BookingCalendar;

/** Тип события, доступный для бронирования (публичное представление). */
model EventType {
  id: int32;
  name: string;
  description: string | null;

  /** Длительность одного слота в минутах: 15 или 30 (BR-5). */
  duration_minutes: 15 | 30;

  /** Цвет для отображения в календаре (например, HEX). */
  color: string;
}

/** Один слот в сетке доступности. Не содержит персональных данных гостей. */
model Slot {
  /** Начало слота, "HH:mm". */
  start: TimeOfDay;

  /** Конец слота, "HH:mm". */
  end: TimeOfDay;

  status: SlotStatus;
}

/** Ответ со списком слотов доступности на конкретную дату для конкретного типа события. */
model SlotsResponse {
  date: CalendarDate;
  event_type_id: int32;
  slots: Slot[];
}

/** Одна бронь гостя (для отображения "моих" броней в рамках дня). */
model GuestBookingItem {
  status: BookingStatus;

  /** Начало забронированного слота, "HH:mm". */
  start: TimeOfDay;

  /** Конец забронированного слота, "HH:mm". */
  end: TimeOfDay;
}

/** Ответ со списком броней гостя за указанную дату (идентификация по email). */
model GuestBookingsResponse {
  date: CalendarDate;
  bookings: GuestBookingItem[];
}

/** Дата, закрытая для бронирования (полностью или частично) — availability exception. */
model ClosedDate {
  date: CalendarDate;
  is_closed: boolean;

  /** Начало интервала-исключения, если закрытие частичное (не весь день). */
  start_time: TimeOfDay | null;

  /** Конец интервала-исключения, если закрытие частичное. */
  end_time: TimeOfDay | null;
}

model ClosedDatesResponse {
  dates: ClosedDate[];
}

/** Данные гостя, передаваемые при оформлении брони. */
model GuestInput {
  @maxLength(255)
  name: string;

  @format("email")
  email: string;

  /** Телефон в российском формате `+7 (XXX) XXX-XX-XX`; формат проверяется бизнес-логикой, не схемой. */
  phone: string;

  @maxLength(1000)
  comment?: string | null;
}

/** Один слот в составе запроса на бронирование. */
model BookingSlotInput {
  /** Начало слота, "HH:mm". */
  start: TimeOfDay;
}

/**
 * Тело запроса на создание брони.
 * Может содержать несколько последовательных слотов одного типа события (FR-12, D-7).
 */
model CreateBookingRequest {
  event_type_id: int32;
  date: CalendarDate;
  guest: GuestInput;

  @minItems(1)
  slots: BookingSlotInput[];
}

/** Ответ при успешном создании брони(й). */
model CreateBookingResponse {
  /** Идентификатор группы брони, объединяющий все слоты одной операции (FR-12). */
  booking_group_id: string;

  status: BookingStatus;
}
