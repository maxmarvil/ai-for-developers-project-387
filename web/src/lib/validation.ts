/** Client-side validation mirrors backend checks (NFR-1); backend is authoritative. */

// Russian phone in the canonical display format: +7 (XXX) XXX-XX-XX
const PHONE_DISPLAY_RE = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_DISPLAY_RE.test(phone.trim());
}

/**
 * Progressively format raw digits into "+7 (XXX) XXX-XX-XX" as the user types.
 * Leading 7/8 country digit is normalized to +7.
 */
export function formatPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11); // 7 + 10 national digits

  const national = digits.slice(1);
  let out = '+7';
  if (national.length > 0) out += ` (${national.slice(0, 3)}`;
  if (national.length >= 3) out += ')';
  if (national.length > 3) out += ` ${national.slice(3, 6)}`;
  if (national.length > 6) out += `-${national.slice(6, 8)}`;
  if (national.length > 8) out += `-${national.slice(8, 10)}`;
  return out;
}
