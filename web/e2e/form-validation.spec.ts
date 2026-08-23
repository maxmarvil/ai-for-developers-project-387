import { expect, test } from '@playwright/test';
import {
  fillGuestForm,
  openBooking,
  selectEventType30,
  selectOpenDate,
  selectSlot,
  submitGuestForm,
} from './fixtures/helpers';
import { VALID_GUEST } from './fixtures/data';

test.describe('form validation', () => {
  test.beforeEach(async ({ page }) => {
    await openBooking(page);
    await selectEventType30(page);
    await selectOpenDate(page);
    await selectSlot(page, '10:00');
  });

  test('UC-8: invalid email shows field error without clearing other fields', async ({ page }) => {
    await fillGuestForm(page, { email: 'not-an-email' });
    await submitGuestForm(page);

    await expect(page.getByTestId('guest-email-error')).toBeVisible();
    await expect(page.getByTestId('guest-name')).toHaveValue(VALID_GUEST.name);
    await expect(page.getByTestId('guest-phone')).toHaveValue(VALID_GUEST.phone);
    await expect(page).toHaveURL('/');
  });

  test('UC-9: phone formats progressively and rejects incomplete number', async ({ page }) => {
    await page.getByTestId('guest-name').fill(VALID_GUEST.name);
    await page.getByTestId('guest-email').fill(VALID_GUEST.email);

    await page.getByTestId('guest-phone').fill('9991234567');
    await expect(page.getByTestId('guest-phone')).toHaveValue('+7 (999) 123-45-67');

    await page.getByTestId('guest-phone').fill('');
    await page.getByTestId('guest-phone').fill('123');
    await submitGuestForm(page);

    await expect(page.getByTestId('guest-phone-error')).toBeVisible();
    await expect(page.getByTestId('guest-name')).toHaveValue(VALID_GUEST.name);
  });

  test('UC-10: required fields block submit; empty comment is allowed', async ({ page }) => {
    await submitGuestForm(page);
    await expect(page.getByTestId('guest-name-error')).toBeVisible();
    await expect(page.getByTestId('guest-email-error')).toBeVisible();
    await expect(page.getByTestId('guest-phone-error')).toBeVisible();

    await fillGuestForm(page);
    await expect(page.getByTestId('guest-comment')).toHaveValue('');
    await submitGuestForm(page);

    await expect(page).toHaveURL(/\/confirmation$/);
  });
});
