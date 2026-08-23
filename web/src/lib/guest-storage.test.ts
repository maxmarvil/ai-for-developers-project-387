import { describe, expect, test, afterEach, beforeEach } from 'vitest';
import { loadGuest, saveGuest, clearGuest, type StoredGuest } from './guest-storage';

describe('guest-storage', () => {
  beforeEach(() => clearGuest());

  afterEach(() => clearGuest());

  describe('saveGuest / loadGuest', () => {
    test('saves and loads a guest record', () => {
      const guest: StoredGuest = {
        name: 'Иван Иванов',
        email: 'ivan@example.com',
        phone: '+7 (999) 123-45-67',
      };
      saveGuest(guest);
      // vitest jsdom has a real localStorage, so loadGuest should pick it up.
      expect(loadGuest()).toEqual(guest);
    });

    test('returns null when no guest is stored', () => {
      clearGuest();
      expect(loadGuest()).toBeNull();
    });

    test('overwrites existing guest with new values', () => {
      saveGuest({ name: 'Петр', email: 'petr@example.com', phone: '+7 (999) 000-00-00' });
      saveGuest({ name: 'Иван', email: 'ivan@example.com', phone: '+7 (999) 123-45-67' });
      expect(loadGuest()).toEqual({
        name: 'Иван',
        email: 'ivan@example.com',
        phone: '+7 (999) 123-45-67',
      });
    });

    test('stores only name, email, phone — omits comment (FR-11 / D-5)', () => {
      // Comment field doesn't belong in StoredGuest since it is a per-booking field.
      const guest: StoredGuest = {
        name: 'Анна',
        email: 'anna@example.com',
        phone: '+7 (999) 111-11-11',
      };
      saveGuest(guest);
      const loaded = loadGuest();
      expect(loaded).not.toHaveProperty('comment');
      expect(loaded).toEqual(guest);
    });

    test('handles empty but valid guest (empty strings)', () => {
      saveGuest({ name: '', email: 'a@b.co', phone: '' });
      const loaded = loadGuest();
      expect(loaded?.email).toBe('a@b.co');
    });
  });

  describe('clearGuest', () => {
    test('removes stored guest from localStorage', () => {
      saveGuest({ name: 'X', email: 'x@test.com', phone: '+7 (000) 000-00-00' });
      clearGuest();
      expect(loadGuest()).toBeNull();
    });

    test('is idempotent when nothing is stored', () => {
      clearGuest();
      clearGuest();
      expect(loadGuest()).toBeNull();
    });
  });
});
