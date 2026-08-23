import "@typespec/http";
import "../models/common.tsp";
import "../models/public.tsp";

using TypeSpec.Http;

namespace BookingCalendar;

@tag("Public")
@route("/event-types")
interface PublicEventTypes {
  /** Список активных типов событий, доступных для бронирования. */
  @get
  list(): EventType[];
}

@tag("Public")
@route("/closed-dates")
interface PublicClosedDates {
  /** Список дат-исключений (полностью или частично закрытых) в горизонте бронирования. */
  @get
  list(): ClosedDatesResponse;
}

@tag("Public")
@route("/slots")
interface PublicSlots {
  /**
   * Сырые слоты доступности на конкретную дату для конкретного типа события.
   * Возвращает 404, если дата закрыта по исключению (FR-14, D-6).
   */
  @get
  list(
    @query event_type_id: int32,
    @query date: CalendarDate,
  ): SlotsResponse | NotFoundError;
}

@tag("Public")
@route("/guest-bookings")
interface PublicGuestBookings {
  /** Брони гостя (по email) на конкретную дату — для предзаполнения и клиентской проверки лимита/последовательности. */
  @get
  list(
    @query email: string,
    @query date: CalendarDate,
  ): GuestBookingsResponse;
}

@tag("Public")
@route("/bookings")
interface PublicBookings {
  /**
   * Создание брони на один или несколько последовательных слотов одного типа события (FR-12).
   * Бэкенд проверяет лимит 2 часа на гостя (BR-1), последовательность слотов (D-7),
   * занятость (BR-2) и попадание в периоды доступности (BR-3).
   */
  @post
  create(@body body: CreateBookingRequest): {
    @statusCode statusCode: 201;
    @body result: CreateBookingResponse;
  } | {
    @statusCode statusCode: 400;
    @body error: ApiError;
  } | {
    @statusCode statusCode: 422;
    @body error: ApiError;
  };
}
