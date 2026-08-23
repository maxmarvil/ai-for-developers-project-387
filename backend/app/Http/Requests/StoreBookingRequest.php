<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ErrorCode;
use App\Exceptions\BookingException;
use App\Models\EventType;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'event_type_id' => ['required', 'integer', 'exists:event_types,id'],
            'date' => ['required', 'date_format:Y-m-d'],
            'guest' => ['required', 'array'],
            'guest.name' => ['required', 'string', 'max:255'],
            'guest.email' => ['required', 'email', 'max:255'],
            'guest.phone' => ['required', 'string', 'regex:/^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/'],
            'guest.comment' => ['nullable', 'string', 'max:1000'],
            'slots' => ['required', 'array', 'min:1'],
            'slots.*.start' => ['required', 'date_format:H:i'],
        ];
    }

    public function messages(): array
    {
        return [
            'guest.phone.regex' => 'Phone must be in the format +7 (XXX) XXX-XX-XX.',
        ];
    }

    protected function passedValidation(): void
    {
        $date = Carbon::parse($this->input('date'));
        $today = Carbon::today();
        $maxDate = $today->copy()->addDays(14);

        if ($date->lte($today) || $date->gt($maxDate)) {
            throw new BookingException(
                ErrorCode::DATE_OUT_OF_RANGE,
                'Requested date is outside the booking horizon.',
            );
        }

        $eventType = EventType::find($this->input('event_type_id'));

        if ($eventType === null || ! $eventType->is_active) {
            throw new BookingException(
                ErrorCode::SLOT_UNAVAILABLE,
                'Selected event type is not available for booking.',
            );
        }
    }
}
