import type { GuestInput } from '@/api/client';

/** Persisted guest identity (FR-11 / D-5). Comment is intentionally not stored. */
export type StoredGuest = Pick<GuestInput, 'name' | 'email' | 'phone'>;

const STORAGE_KEY = 'booking:guest';

export function loadGuest(): StoredGuest | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredGuest>;
    if (!parsed.email) return null;
    return {
      name: parsed.name ?? '',
      email: parsed.email,
      phone: parsed.phone ?? '',
    };
  } catch {
    return null;
  }
}

export function saveGuest(guest: StoredGuest): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guest));
  } catch {
    // Ignore quota / privacy-mode failures — persistence is best-effort.
  }
}

export function clearGuest(): void {
  localStorage.removeItem(STORAGE_KEY);
}
