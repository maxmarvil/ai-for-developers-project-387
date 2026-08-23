import { expect, test } from '@playwright/test';
import {
  BOOKING_SUCCESS,
  ERROR_LIMIT_EXCEEDED,
  ERROR_SLOT_TAKEN,
  SLOTS_30_AFTER_TAKEN,
  SLOTS_30_OPEN,
  VALID_GUEST,
} from './fixtures/data';
import {
  fillGuestForm,
  openBooking,
  selectEventType30,
  selectOpenDate,
  selectSlot,
  submitGuestForm,
} from './fixtures/helpers';
import { CLOSED_DATE, OPEN_DATE } from './fixtures/time';

test.describe('booking errors', () => {
  test('UC-5: SLOT_TAKEN then recover with another slot', async ({ page }) => {
    let postCount = 0;
    let slotsVersion: 'open' | 'taken' = 'open';

    await openBooking(page, {
      slots: () => (slotsVersion === 'taken' ? SLOTS_30_AFTER_TAKEN : SLOTS_30_OPEN),
      createBooking: async (route) => {
        postCount += 1;
        if (postCount === 1) {
          slotsVersion = 'taken';
          // 422 is in the OpenAPI contract for business errors on POST /bookings.
          await route.fulfill({
            status: 422,
            contentType: 'application/json',
            body: JSON.stringify(ERROR_SLOT_TAKEN),
          });
          return;
        }
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(BOOKING_SUCCESS),
        });
      },
    });

    await selectEventType30(page);
    await selectOpenDate(page);
    await selectSlot(page, '10:00');
    await fillGuestForm(page);
    await submitGuestForm(page);

    const apiError = page.getByTestId('api-error');
    await expect(apiError).toBeVisible();
    await expect(apiError).toHaveAttribute('data-error-code', 'SLOT_TAKEN');

    // Form data preserved (form stays mounted after selection prune)
    await expect(page.getByTestId('guest-name')).toHaveValue(VALID_GUEST.name);
    await expect(page.getByTestId('guest-email')).toHaveValue(VALID_GUEST.email);

    // Grid refreshed: conflict slot pending; sole selection pruned
    await expect(page.getByTestId('slot-10:00')).toHaveAttribute('data-status', 'pending');
    await expect(page.getByTestId('slot-10:00')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('selection-cleared-hint')).toBeVisible();

    // Recover with another free slot — no need to re-fill guest fields
    await selectSlot(page, '10:30');
    await submitGuestForm(page);

    await expect(page).toHaveURL(/\/confirmation$/);
    await expect(page.getByTestId('booking-group-id')).toHaveText(BOOKING_SUCCESS.booking_group_id);
    expect(postCount).toBe(2);
  });

  test('UC-6: LIMIT_EXCEEDED keeps form data', async ({ page }) => {
    await openBooking(page, {
      createBooking: async (route) => {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify(ERROR_LIMIT_EXCEEDED),
        });
      },
    });

    await selectEventType30(page);
    await selectOpenDate(page);
    await selectSlot(page, '10:00');
    await fillGuestForm(page);
    await submitGuestForm(page);

    const apiError = page.getByTestId('api-error');
    await expect(apiError).toBeVisible();
    await expect(apiError).toHaveAttribute('data-error-code', 'LIMIT_EXCEEDED');
    await expect(page.getByTestId('guest-name')).toHaveValue(VALID_GUEST.name);
    await expect(page.getByTestId('guest-email')).toHaveValue(VALID_GUEST.email);
    await expect(page).toHaveURL('/');
  });

  test('UC-7: fully closed date is hidden from picker', async ({ page }) => {
    await openBooking(page);
    await selectEventType30(page);

    await expect(page.getByTestId(`date-${OPEN_DATE}`)).toBeVisible();
    await expect(page.getByTestId(`date-${CLOSED_DATE}`)).toHaveCount(0);
  });
});
