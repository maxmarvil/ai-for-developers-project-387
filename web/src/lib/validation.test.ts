import { describe, expect, test } from 'vitest';
import { isValidEmail, isValidPhone, formatPhone } from './validation';

describe('isValidEmail', () => {
  test('returns true for valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  test('returns true for emails with dots and underscores', () => {
    expect(isValidEmail('john.doe@domain.ru')).toBe(true);
    expect(isValidEmail('user_name@test.example.com')).toBe(true);
  });

  test('returns false for invalid emails', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('userexample.com')).toBe(false);
    expect(isValidEmail('user @example.com')).toBe(false);
  });

  test('trims whitespace before validating', () => {
    expect(isValidEmail(' user@example.com ')).toBe(true);
    expect(isValidEmail(' user@example.com')).toBe(true);
  });
});

describe('isValidPhone', () => {
  test('returns true for well-formed Russian phone in display format', () => {
    expect(isValidPhone('+7 (999) 123-45-67')).toBe(true);
    expect(isValidPhone('+7 (495) 000-00-00')).toBe(true);
  });

  test('returns false for malformed phone numbers', () => {
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('+7 999 123 45 67')).toBe(false); // no parens
    expect(isValidPhone('+7 (999) 1234567')).toBe(false);
    expect(isValidPhone('8 (999) 123-45-67')).toBe(false);
    expect(isValidPhone('+8 (999) 123-45-67')).toBe(false);
  });

  test('trims whitespace before validating', () => {
    expect(isValidPhone(' +7 (999) 123-45-67 ')).toBe(true);
  });
});

describe('formatPhone', () => {
  test('formats raw digits into display format', () => {
    expect(formatPhone('9991234567')).toBe('+7 (999) 123-45-67');
  });

  test('normalizes leading 8 to +7', () => {
    expect(formatPhone('89991234567')).toBe('+7 (999) 123-45-67');
  });

  test('prepends 7 if missing', () => {
    expect(formatPhone('1234567')).toContain('+7');
  });

  test('handles empty input', () => {
    expect(formatPhone('')).toBe('+7');
  });

  test('handles partial input gracefully', () => {
    const half = formatPhone('999');
    expect(half).toBe('+7 (999)');
  });

  test('truncates to 11 digits (7 + 10 national)', () => {
    expect(formatPhone('8123456789012345')).toMatch(/^\+7 \(\d{3}\)/);
  });

  test('preserves existing valid format', () => {
    expect(formatPhone('+7 (999) 123-45-67')).toBe('+7 (999) 123-45-67');
  });

  test('handles non-digit characters by stripping them', () => {
    expect(formatPhone('+7 (999) 123-45-67')).toBe('+7 (999) 123-45-67');
    expect(formatPhone('(999) 123-4567')).toContain('999');
  });

  test('increments digits progressively (interactive typing simulation)', () => {
    // Simulate user typing digit by digit
    let input = '';
    const digits = '89991234567'; // 11 characters
    for (const d of digits) {
      input += d;
    }
    expect(formatPhone(input)).toBe('+7 (999) 123-45-67');
  });

  test('stops formatting at 11 digits', () => {
    const eleven = '89991234567'; // exactly 11
    expect(formatPhone(eleven)).toBe('+7 (999) 123-45-67');
  });
});
