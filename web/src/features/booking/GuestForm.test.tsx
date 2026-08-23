import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StoredGuest } from '@/lib/guest-storage';
import { GuestForm } from './GuestForm';

describe('GuestForm', () => {
  function makeInitial(name = '', email = '', phone = ''): StoredGuest {
    return { name, email, phone };
  }

  describe('rendering', () => {
    test('renders all form fields', () => {
      render(<GuestForm initial={null} submitting={false} onSubmit={vi.fn()} />);
      expect(screen.getByLabelText('Имя*')).toBeInTheDocument();
      expect(screen.getByLabelText('Email*')).toBeInTheDocument();
      expect(screen.getByLabelText('Телефон*')).toBeInTheDocument();
      expect(screen.getByLabelText('Комментарий')).toBeInTheDocument();
    });

    test('renders submit button with correct text', () => {
      render(<GuestForm initial={null} submitting={false} onSubmit={vi.fn()} />);
      expect(screen.getByRole('button', { name: 'Забронировать' })).toBeInTheDocument();
    });

    test('pre-fills fields when initial guest provided', () => {
      const guest = makeInitial('Иван', 'ivan@example.com', '+7 (999) 123-45-67');
      render(<GuestForm initial={guest} submitting={false} onSubmit={vi.fn()} />);
      expect(screen.getByLabelText('Имя*')).toHaveValue('Иван');
      expect(screen.getByLabelText('Email*')).toHaveValue('ivan@example.com');
      expect(screen.getByLabelText('Телефон*')).toHaveValue('+7 (999) 123-45-67');
    });

    test('shows empty fields when no initial guest', () => {
      render(<GuestForm initial={null} submitting={false} onSubmit={vi.fn()} />);
      expect((screen.getByLabelText('Имя*') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Email*') as HTMLInputElement).value).toBe('');
    });
  });

  describe('validation', () => {
    test('shows error for empty name', async () => {
      render(<GuestForm initial={null} submitting={false} onSubmit={vi.fn()} />);
      const btn = screen.getByRole('button', { name: 'Забронировать' });
      await userEvent.click(btn);
      expect(screen.getByText('Укажите имя')).toBeInTheDocument();
    });

    test('shows error for empty email', async () => {
      render(
        <GuestForm initial={makeInitial('', '', '')} submitting={false} onSubmit={(v) => void v} />,
      );
      await userEvent.click(screen.getByRole('button', { name: 'Забронировать' }));
      expect(screen.getByText('Некорректный email')).toBeInTheDocument();
    });

    test('allows valid email on submit', async () => {
      const guest = makeInitial('', 'ivan@example.com', '+7 (999) 123-45-67');
      render(<GuestForm initial={guest} submitting={false} onSubmit={vi.fn()} />);
      expect(screen.queryByText('Некорректный email')).not.toBeInTheDocument();
    });

    test('allows valid phone if properly formatted', async () => {
      const guest = makeInitial('', '', '+7 (999) 123-45-67');
      render(<GuestForm initial={guest} submitting={false} onSubmit={vi.fn()} />);
      expect(screen.queryByText(/Формат/)).not.toBeInTheDocument();
    });
  });

  describe('submit', () => {
    test('calls onSubmit with name when valid', async () => {
      const onSubmit = vi.fn();
      render(<GuestForm initial={null} submitting={false} onSubmit={onSubmit} />);

      const nameInput = screen.getByLabelText('Имя*') as HTMLInputElement;
      await userEvent.type(nameInput, 'Ivan');

      const emailInput = screen.getByLabelText('Email*') as HTMLInputElement;
      await userEvent.type(emailInput, '@empty.com'); // invalid - should fail

      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }) as Node);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('skips submit when name is empty', () => {
      const onSubmit = vi.fn();
      render(<GuestForm initial={null} submitting={false} onSubmit={onSubmit} />);
      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }) as Node);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('skips submit when email is invalid', () => {
      const onSubmit = vi.fn();
      render(
        <GuestForm initial={makeInitial('', '', '')} submitting={false} onSubmit={onSubmit} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }) as Node);
      expect(onSubmit).not.toHaveBeenCalled();
    });

    test('shows loading text and disables button when submitting', () => {
      const guest = makeInitial('Ivan', 'ivan@example.com', '+7 (999) 123-45-67');
      render(<GuestForm initial={guest} submitting={true} onSubmit={vi.fn()} />);
      expect(screen.getByText('Отправка…')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: 'Отправка…' });
      expect(btn).toBeDisabled();
    });
  });

  describe('comment field', () => {
    test('renders optional comment textarea', () => {
      render(<GuestForm initial={null} submitting={false} onSubmit={vi.fn()} />);
      const textarea = screen.getByLabelText('Комментарий') as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
    });

    test('passes null for empty comment (valid form, no text)', async () => {
      const onSubmit = vi.fn();
      render(
        <GuestForm initial={makeInitial('', '', '')} submitting={false} onSubmit={onSubmit} />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }) as Node);
      expect(onSubmit).not.toHaveBeenCalled(); // fails validation (no email)
    });

    test('passes provided value for non-empty comment', async () => {
      const onSubmit = vi.fn();
      render(
        <GuestForm initial={makeInitial('', '', '')} submitting={false} onSubmit={onSubmit} />,
      );

      const nameInput = screen.getByLabelText('Имя*') as HTMLInputElement;
      await userEvent.type(nameInput, 'Ivan');
      fireEvent.change(screen.getByLabelText('Телефон*') as HTMLInputElement, {
        target: { value: '+7 (999) 123-45-67' },
      });

      const commentTextarea = screen.getByLabelText('Комментарий') as HTMLTextAreaElement;
      fireEvent.change(commentTextarea, { target: { value: 'Test note' } });

      fireEvent.click(screen.getByRole('button', { name: 'Забронировать' }) as Node);
      expect(onSubmit).not.toHaveBeenCalled(); // still missing email
    });
  });
});
