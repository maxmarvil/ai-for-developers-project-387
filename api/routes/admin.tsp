import "@typespec/http";
import "../models/common.tsp";
import "../models/admin.tsp";

using TypeSpec.Http;

namespace BookingCalendar;

/**
 * Все административные операции требуют авторизованной сессии администратора
 * (Laravel session-based auth + CSRF). Отдельный Bearer-токен не используется.
 */
@useAuth(CookieAuth)
@tag("Admin")
@route("/admin/event-types")
interface AdminEventTypes {
  /** Список всех типов событий, включая неактивные. */
  @get
  list(): AdminEventType[];

  @get
  read(@path id: int32): AdminEventType | NotFoundError;

  @post
  create(@body body: CreateEventTypeRequest): {
    @statusCode statusCode: 201;
    @body result: AdminEventType;
  };

  @patch
  update(
    @path id: int32,
    @body body: UpdateEventTypeRequest,
  ): AdminEventType | NotFoundError;

  @delete
  remove(@path id: int32): {
    @statusCode statusCode: 204;
  } | NotFoundError;
}

@useAuth(CookieAuth)
@tag("Admin")
@route("/admin/availability-rules")
interface AdminAvailabilityRules {
  @get
  list(): AvailabilityRule[];

  @get
  read(@path id: int32): AvailabilityRule | NotFoundError;

  @post
  create(@body body: CreateAvailabilityRuleRequest): {
    @statusCode statusCode: 201;
    @body result: AvailabilityRule;
  };

  @patch
  update(
    @path id: int32,
    @body body: UpdateAvailabilityRuleRequest,
  ): AvailabilityRule | NotFoundError;

  @delete
  remove(@path id: int32): {
    @statusCode statusCode: 204;
  } | NotFoundError;
}

@useAuth(CookieAuth)
@tag("Admin")
@route("/admin/availability-exceptions")
interface AdminAvailabilityExceptions {
  @get
  list(): AvailabilityException[];

  @get
  read(@path id: int32): AvailabilityException | NotFoundError;

  @post
  create(@body body: CreateAvailabilityExceptionRequest): {
    @statusCode statusCode: 201;
    @body result: AvailabilityException;
  };

  @patch
  update(
    @path id: int32,
    @body body: UpdateAvailabilityExceptionRequest,
  ): AvailabilityException | NotFoundError;

  @delete
  remove(@path id: int32): {
    @statusCode statusCode: 204;
  } | NotFoundError;
}

@useAuth(CookieAuth)
@tag("Admin")
@route("/admin/bookings")
interface AdminBookings {
  /** Список бронирований с фильтрами по дате и типу события (FR-9). */
  @get
  list(
    @query date?: CalendarDate,
    @query event_type_id?: int32,
  ): AdminBookingListResponse;

  @get
  read(@path id: int32): AdminBooking | NotFoundError;

  /**
   * Изменение статуса брони (FR-10).
   * При установке статуса `cancelled` слот автоматически освобождается (BR-7).
   */
  @patch
  updateStatus(
    @path id: int32,
    @body body: UpdateBookingStatusRequest,
  ): AdminBooking | NotFoundError;
}
