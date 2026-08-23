<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\GuestBookingIndexRequest;
use App\Models\Booking;
use App\Models\Guest;
use Illuminate\Http\JsonResponse;

class GuestBookingController extends Controller
{
    public function index(GuestBookingIndexRequest $request): JsonResponse
    {
        $email = $request->input('email');
        $date = $request->input('date');

        $guest = Guest::query()->where('email', mb_strtolower(trim($email)))->first();

        if ($guest === null) {
            return response()->json([
                'date' => $date,
                'bookings' => [],
            ]);
        }

        $bookings = Booking::query()
            ->where('guest_id', $guest->id)
            ->whereDate('date', $date)
            ->whereIn('status', [BookingStatus::PENDING->value, BookingStatus::CONFIRMED->value])
            ->orderBy('starts_at')
            ->get(['status', 'starts_at', 'ends_at'])
            ->map(function (Booking $booking) {
                return [
                    'status' => $booking->status->value,
                    'start' => $booking->starts_at->format('H:i'),
                    'end' => $booking->ends_at->format('H:i'),
                ];
            });

        return response()->json([
            'date' => $date,
            'bookings' => $bookings,
        ]);
    }
}
