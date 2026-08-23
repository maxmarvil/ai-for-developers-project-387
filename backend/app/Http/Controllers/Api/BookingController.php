<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreBookingRequest;
use App\Models\EventType;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;

class BookingController extends Controller
{
    public function __construct(private readonly BookingService $bookingService) {}

    public function store(StoreBookingRequest $request): JsonResponse
    {
        $eventType = EventType::findOrFail($request->integer('event_type_id'));

        $result = $this->bookingService->create(
            eventType: $eventType,
            date: $request->input('date'),
            startTimes: array_map(
                fn (array $slot) => $slot['start'],
                $request->input('slots'),
            ),
            guestData: $request->input('guest'),
            comment: $request->input('guest.comment'),
        );

        return response()->json($result, 201);
    }
}
