import { CLOSED_DATE, OPEN_DATE } from './time';

export const EVENT_TYPE_30 = {
  id: 1,
  name: 'Консультация 30',
  description: '30-минутная консультация',
  duration_minutes: 30 as const,
  color: '#2563eb',
};

export const EVENT_TYPE_15 = {
  id: 2,
  name: 'Экспресс 15',
  description: '15-минутный слот',
  duration_minutes: 15 as const,
  color: '#16a34a',
};

export const EVENT_TYPES = [EVENT_TYPE_30, EVENT_TYPE_15];

export const CLOSED_DATES_RESPONSE = {
  dates: [
    {
      date: CLOSED_DATE,
      is_closed: true,
      start_time: null,
      end_time: null,
    },
  ],
};

/** Default slots for 30-min type on OPEN_DATE. */
export const SLOTS_30_OPEN = {
  date: OPEN_DATE,
  event_type_id: EVENT_TYPE_30.id,
  slots: [
    { start: '10:00', end: '10:30', status: 'free' as const },
    { start: '10:30', end: '11:00', status: 'free' as const },
    { start: '11:00', end: '11:30', status: 'free' as const },
    { start: '11:30', end: '12:00', status: 'free' as const },
    { start: '12:00', end: '12:30', status: 'free' as const },
    { start: '12:30', end: '13:00', status: 'pending' as const },
    { start: '13:00', end: '13:30', status: 'confirmed' as const },
    { start: '14:00', end: '14:30', status: 'free' as const },
  ],
};

/** After UC-5 race: 10:00 becomes pending. */
export const SLOTS_30_AFTER_TAKEN = {
  ...SLOTS_30_OPEN,
  slots: SLOTS_30_OPEN.slots.map((s) =>
    s.start === '10:00' ? { ...s, status: 'pending' as const } : s,
  ),
};

export const SLOTS_15_OPEN = {
  date: OPEN_DATE,
  event_type_id: EVENT_TYPE_15.id,
  slots: [
    { start: '09:00', end: '09:15', status: 'free' as const },
    { start: '09:15', end: '09:30', status: 'free' as const },
    { start: '09:30', end: '09:45', status: 'free' as const },
  ],
};

export const BOOKING_SUCCESS = {
  booking_group_id: 'grp-e2e-001',
  status: 'pending' as const,
};

export const ERROR_SLOT_TAKEN = {
  code: 'SLOT_TAKEN' as const,
  message: 'Один или несколько выбранных слотов уже заняты.',
};

export const ERROR_LIMIT_EXCEEDED = {
  code: 'LIMIT_EXCEEDED' as const,
  message: 'Превышен лимит бронирований — не более 2 часов на одного гостя.',
};

export const VALID_GUEST = {
  name: 'Иван Тестов',
  email: 'ivan.e2e@example.com',
  phone: '+7 (999) 111-22-33',
};
