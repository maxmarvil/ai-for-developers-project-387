<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ErrorCode;
use App\Exceptions\BookingException;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;

class SlotIndexRequest extends FormRequest
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
    }
}
