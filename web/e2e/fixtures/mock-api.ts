import type { Page, Route } from '@playwright/test';
import {
  BOOKING_SUCCESS,
  CLOSED_DATES_RESPONSE,
  EVENT_TYPES,
  EVENT_TYPE_15,
  EVENT_TYPE_30,
  SLOTS_15_OPEN,
  SLOTS_30_OPEN,
} from './data';

export type MockApiOverrides = {
  /** Custom GET /slots response (or factory). */
  slots?: unknown | ((url: URL) => unknown);
  /** Custom POST /bookings handler. */
  createBooking?: (route: Route, body: unknown) => Promise<void> | void;
  eventTypes?: unknown;
  closedDates?: unknown;
};

async function json(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function defaultSlots(url: URL) {
  const eventTypeId = Number(url.searchParams.get('event_type_id'));
  if (eventTypeId === EVENT_TYPE_15.id) return SLOTS_15_OPEN;
  return { ...SLOTS_30_OPEN, event_type_id: eventTypeId || EVENT_TYPE_30.id };
}

/**
 * Intercepts all `/api/v1/**` requests with deterministic fixture responses.
 */
export async function installMockApi(page: Page, overrides: MockApiOverrides = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api\/v1/, '') || '/';
    const method = req.method();

    if (method === 'GET' && path === '/event-types') {
      await json(route, 200, overrides.eventTypes ?? EVENT_TYPES);
      return;
    }

    if (method === 'GET' && path === '/closed-dates') {
      await json(route, 200, overrides.closedDates ?? CLOSED_DATES_RESPONSE);
      return;
    }

    if (method === 'GET' && path === '/slots') {
      const slotsOverride = overrides.slots;
      const body =
        typeof slotsOverride === 'function'
          ? slotsOverride(url)
          : (slotsOverride ?? defaultSlots(url));
      await json(route, 200, body);
      return;
    }

    if (method === 'GET' && path === '/guest-bookings') {
      await json(route, 200, {
        date: url.searchParams.get('date'),
        bookings: [],
      });
      return;
    }

    if (method === 'POST' && path === '/bookings') {
      if (overrides.createBooking) {
        let body: unknown = null;
        try {
          body = req.postDataJSON();
        } catch {
          body = null;
        }
        await overrides.createBooking(route, body);
        return;
      }
      await json(route, 201, BOOKING_SUCCESS);
      return;
    }

    await json(route, 404, { code: 'NOT_FOUND', message: `No mock for ${method} ${path}` });
  });
}
