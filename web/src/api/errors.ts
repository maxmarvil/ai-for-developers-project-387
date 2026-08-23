import type { ApiError, ErrorCode } from './client';

/** Error thrown by query/mutation hooks, carrying the machine-readable code. */
export class BookingApiError extends Error {
  readonly code: ErrorCode | 'UNKNOWN';
  readonly fieldErrors?: Record<string, string[]>;

  constructor(payload: ApiError | undefined, fallback: string) {
    super(payload?.message ?? fallback);
    this.name = 'BookingApiError';
    this.code = payload?.code ?? 'UNKNOWN';
    this.fieldErrors = payload?.errors;
  }
}

/** Human-readable (Russian) messages per business error code (BR-1..BR-4, FR-13/14). */
const MESSAGES: Record<ErrorCode, string> = {
  LIMIT_EXCEEDED: 'Превышен лимит бронирований — не более 2 часов на одного гостя.',
  SLOT_NOT_SEQUENTIAL: 'Слоты должны идти подряд и быть одного типа события.',
  SLOT_TAKEN: 'Один или несколько выбранных слотов уже заняты. Обновите календарь.',
  SLOT_UNAVAILABLE: 'Слот недоступен для бронирования.',
  DATE_OUT_OF_RANGE: 'Дата вне доступного горизонта бронирования (14 дней, кроме сегодня).',
  NOT_FOUND: 'Данные не найдены.',
  VALIDATION_ERROR: 'Проверьте правильность заполнения полей.',
};

export function errorMessage(error: unknown): string {
  if (error instanceof BookingApiError && error.code !== 'UNKNOWN') {
    return MESSAGES[error.code];
  }
  if (error instanceof Error) return error.message;
  return 'Неизвестная ошибка. Попробуйте позже.';
}
