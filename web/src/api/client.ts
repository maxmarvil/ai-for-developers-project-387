import createClient from 'openapi-fetch';
import type { components, paths } from './schema';

/**
 * Typed API client. Base URL is the `/api/v1` prefix that Vite proxies to the
 * Prism mock in dev and the real Laravel backend in production.
 */
export const api = createClient<paths>({ baseUrl: '/api/v1' });

// Re-export commonly used schema types for ergonomic imports across the app.
export type EventType = components['schemas']['EventType'];
export type Slot = components['schemas']['Slot'];
export type SlotStatus = components['schemas']['SlotStatus'];
export type SlotsResponse = components['schemas']['SlotsResponse'];
export type ClosedDate = components['schemas']['ClosedDate'];
export type GuestBookingItem = components['schemas']['GuestBookingItem'];
export type GuestInput = components['schemas']['GuestInput'];
export type CreateBookingRequest = components['schemas']['CreateBookingRequest'];
export type CreateBookingResponse = components['schemas']['CreateBookingResponse'];
export type BookingStatus = components['schemas']['BookingStatus'];
export type ApiError = components['schemas']['ApiError'];
export type ErrorCode = components['schemas']['ErrorCode'];
