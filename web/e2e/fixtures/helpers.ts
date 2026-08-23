import type { Page } from '@playwright/test';
import { FROZEN_NOW_ISO, OPEN_DATE } from './time';
import { installMockApi, type MockApiOverrides } from './mock-api';
import { EVENT_TYPE_30, VALID_GUEST } from './data';

export async function openBooking(page: Page, overrides: MockApiOverrides = {}) {
  await installMockApi(page, overrides);
  await page.clock.install({ time: new Date(FROZEN_NOW_ISO) });
  await page.goto('/');
}

export async function selectEventType30(page: Page) {
  await page.getByTestId(`event-type-${EVENT_TYPE_30.id}`).click();
}

export async function selectOpenDate(page: Page, date = OPEN_DATE) {
  await page.getByTestId(`date-${date}`).click();
}

export async function selectSlot(page: Page, start: string) {
  await page.getByTestId(`slot-${start}`).click();
}

export async function fillGuestForm(
  page: Page,
  guest: Partial<typeof VALID_GUEST> & { comment?: string } = {},
) {
  const data = { ...VALID_GUEST, ...guest };
  await page.getByTestId('guest-name').fill(data.name);
  await page.getByTestId('guest-email').fill(data.email);
  await page.getByTestId('guest-phone').fill(data.phone);
  if (guest.comment !== undefined) {
    await page.getByTestId('guest-comment').fill(guest.comment);
  }
}

export async function submitGuestForm(page: Page) {
  await page.getByTestId('guest-submit').click();
}
