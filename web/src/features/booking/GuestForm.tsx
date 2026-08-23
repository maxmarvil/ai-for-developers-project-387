import { useState, type FormEvent } from 'react';
import type { GuestInput } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhone, isValidEmail, isValidPhone } from '@/lib/validation';
import type { StoredGuest } from '@/lib/guest-storage';

interface Props {
  initial: StoredGuest | null;
  submitting: boolean;
  onSubmit: (guest: GuestInput) => void;
}

type Errors = Partial<Record<'name' | 'email' | 'phone', string>>;

/** FR-3/FR-11: guest details form with client-side validation and prefill. */
export function GuestForm({ initial, submitting, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Укажите имя';
    if (!isValidEmail(email)) next.email = 'Некорректный email';
    if (!isValidPhone(phone)) next.phone = 'Формат: +7 (XXX) XXX-XX-XX';
    return next;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      comment: comment.trim() || null,
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={handleSubmit}
      noValidate
      data-testid="guest-form"
    >
      <label className="flex flex-col gap-1 text-sm">
        Имя*
        <Input
          data-testid="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={!!errors.name}
          placeholder="Иван Иванов"
        />
        {errors.name && (
          <span className="text-xs text-red-600" data-testid="guest-name-error">
            {errors.name}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Email*
        <Input
          data-testid="guest-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!errors.email}
          placeholder="ivan@example.com"
        />
        {errors.email && (
          <span className="text-xs text-red-600" data-testid="guest-email-error">
            {errors.email}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Телефон*
        <Input
          data-testid="guest-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          aria-invalid={!!errors.phone}
          placeholder="+7 (999) 123-45-67"
        />
        {errors.phone && (
          <span className="text-xs text-red-600" data-testid="guest-phone-error">
            {errors.phone}
          </span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Комментарий
        <textarea
          data-testid="guest-comment"
          className="min-h-[72px] rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
      </label>

      <Button type="submit" disabled={submitting} data-testid="guest-submit">
        {submitting ? 'Отправка…' : 'Забронировать'}
      </Button>
    </form>
  );
}
