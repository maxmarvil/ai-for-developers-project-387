import { expect, test } from '@playwright/test';
import { BOOKING_SUCCESS, EVENT_TYPE_15, EVENT_TYPE_30, VALID_GUEST } from './fixtures/data';
import {
  fillGuestForm,
  openBooking,
  selectEventType30,
  selectOpenDate,
  selectSlot,
  submitGuestForm,
} from './fixtures/helpers';
import { CLOSED_DATE, OPEN_DATE, TODAY } from './fixtures/time';

test.describe('booking happy path', () => {
  test('UC-1: calendar shows types, horizon, slot states; closed date hidden', async ({ page }) => {
    await openBooking(page);

    await expect(page.getByTestId(`event-type-${EVENT_TYPE_30.id}`)).toBeVisible();
    await expect(page.getByTestId(`event-type-${EVENT_TYPE_15.id}`)).toBeVisible();

    await selectEventType30(page);

    await expect(page.getByTestId(`date-${TODAY}`)).toHaveCount(0);
    await expect(page.getByTestId(`date-${CLOSED_DATE}`)).toHaveCount(0);
    await expect(page.getByTestId(`date-${OPEN_DATE}`)).toBeVisible();

    await selectOpenDate(page);

    await expect(page.getByTestId('slot-10:00')).toHaveAttribute('data-status', 'free');
    await expect(page.getByTestId('slot-12:30')).toHaveAttribute('data-status', 'pending');
    await expect(page.getByTestId('slot-13:00')).toHaveAttribute('data-status', 'confirmed');
    await expect(page.getByTestId('slot-12:30')).toBeDisabled();
    await expect(page.getByTestId('slot-13:00')).toBeDisabled();
  });

  test('UC-2: book one free slot and land on confirmation', async ({ page }) => {
    await openBooking(page);
    await selectEventType30(page);
    await selectOpenDate(page);
    await selectSlot(page, '10:00');
    await fillGuestForm(page);
    await submitGuestForm(page);

    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(page.getByTestId('booking-group-id')).toHaveText(BOOKING_SUCCESS.booking_group_id);
    await expect(page.getByTestId('booking-status')).toHaveAttribute('data-status', 'pending');
    await expect(page.getByRole('button', { name: /отмен/i })).toHaveCount(0);
    await expect(page.getByText(/отмен/i)).toHaveCount(0);
  });

  test('UC-3: multi-slot booking and client 2h cap', async ({ page }) => {
    await openBooking(page);
    await selectEventType30(page);
    await selectOpenDate(page);

    // 4 × 30 = 120 min (at limit)
    await selectSlot(page, '10:00');
    await selectSlot(page, '10:30');
    await selectSlot(page, '11:00');
    await selectSlot(page, '11:30');
    await expect(page.getByTestId('selection-summary')).toContainText('120 мин');
    await expect(page.getByTestId('selection-summary')).toContainText('лимит 2 ч');

    // 5th contiguous free would be 12:00 — must not extend past cap
    await selectSlot(page, '12:00');
    await expect(page.getByTestId('slot-12:00')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('selection-summary')).toContainText('4');

    await fillGuestForm(page);
    await submitGuestForm(page);

    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(page.getByTestId('booking-group-id')).toHaveText(BOOKING_SUCCESS.booking_group_id);
  });

  test('UC-4: returning guest prefill from localStorage', async ({ page }) => {
    await page.addInitScript((guest) => {
      localStorage.setItem('booking:guest', JSON.stringify(guest));
    }, VALID_GUEST);

    await openBooking(page);
    await selectEventType30(page);
    await selectOpenDate(page);
    await selectSlot(page, '14:00');

    await expect(page.getByTestId('guest-name')).toHaveValue(VALID_GUEST.name);
    await expect(page.getByTestId('guest-email')).toHaveValue(VALID_GUEST.email);
    await expect(page.getByTestId('guest-phone')).toHaveValue(VALID_GUEST.phone);
    await expect(page.getByTestId('guest-comment')).toHaveValue('');

    await page.getByTestId('guest-name').fill('Пётр Изменённый');
    await expect(page.getByTestId('guest-name')).toHaveValue('Пётр Изменённый');
  });
});
