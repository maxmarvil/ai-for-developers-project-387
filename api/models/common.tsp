import "@typespec/http";

using TypeSpec.Http;

namespace BookingCalendar;

/**
 * Session-based аутентификация администратора (Laravel session cookie + CSRF).
 * Отдельный Bearer-токен для API не используется.
 */
alias CookieAuth = ApiKeyAuth<ApiKeyLocation.cookie, "laravel_session">;

/**
 * Статус слота в общей сетке доступности.
 * Видим всем без исключений персональных данных.
 */
enum SlotStatus {
  free: "free",
  pending: "pending",
  confirmed: "confirmed",
}

/**
 * Статус брони.
 */
enum BookingStatus {
  pending: "pending",
  confirmed: "confirmed",
  cancelled: "cancelled",
}

/**
 * Машиночитаемые коды бизнес-ошибок.
 */
enum ErrorCode {
  /** Суммарная продолжительность бронирований гостя за день превышает лимит (BR-1). */
  LIMIT_EXCEEDED: "LIMIT_EXCEEDED",

  /** Переданные слоты не образуют непрерывную последовательность одного типа события (D-7, BR-4). */
  SLOT_NOT_SEQUENTIAL: "SLOT_NOT_SEQUENTIAL",

  /** Один или несколько запрошенных слотов уже заняты (BR-2). */
  SLOT_TAKEN: "SLOT_TAKEN",

  /** Слот находится вне периодов доступности или попадает в исключение (BR-3). */
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",

  /** Запрошенная дата вне горизонта бронирования 14 дней либо является текущим днём (FR-13, FR-14). */
  DATE_OUT_OF_RANGE: "DATE_OUT_OF_RANGE",

  /** Ресурс не найден (например, день закрыт по исключению). */
  NOT_FOUND: "NOT_FOUND",

  /** Ошибка валидации входных полей. */
  VALIDATION_ERROR: "VALIDATION_ERROR",
}

/**
 * Единый формат ошибки для всего API.
 * Формат в стиле Laravel (`message` + `errors`), дополненный
 * машиночитаемым `code` на верхнем уровне.
 */
@error
model ApiError {
  /** Машиночитаемый код ошибки. */
  code: ErrorCode;

  /** Человекочитаемое сообщение об ошибке. */
  message: string;

  /**
   * Ошибки валидации по полям (как в Laravel):
   * ключ — имя поля, значение — список сообщений.
   * Присутствует только при `code = VALIDATION_ERROR`.
   */
  errors?: Record<string[]>;
}

@error
model NotFoundError {
  code: ErrorCode.NOT_FOUND;
  message: string;
}

/** Время слота в формате "HH:mm" (naive, без часового пояса; подразумевается Europe/Moscow). */
scalar TimeOfDay extends string;

/** Дата в формате "YYYY-MM-DD" (naive, без часового пояса; подразумевается Europe/Moscow). */
scalar CalendarDate extends plainDate;
