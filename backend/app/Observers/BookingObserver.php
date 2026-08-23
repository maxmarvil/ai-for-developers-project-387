<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\Booking;
use App\Models\EventType;
use App\Services\SlotService;

final class BookingObserver
{
    public function __construct(private readonly SlotService $slotService) {}

    public function created(Booking $booking): void
    {
        $this->invalidateForBooking($booking);
    }

    public function updated(Booking $booking): void
    {
        $this->invalidateForBooking($booking);
    }

    public function deleted(Booking $booking): void
    {
        $this->invalidateForBooking($booking);
    }

    public function restored(Booking $booking): void
    {
        $this->invalidateForBooking($booking);
    }

    private function invalidateForBooking(Booking $booking): void
    {
        /** @var EventType|null $eventType */
        $eventType = $booking->eventType;

        if ($eventType === null) {
            return;
        }

        $this->slotService->invalidate($eventType, $booking->date->format('Y-m-d'));
    }
}
