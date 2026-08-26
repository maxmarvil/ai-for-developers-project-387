<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\BookingStatus;
use App\Enums\SlotStatus;
use App\Models\AvailabilityException;
use App\Models\AvailabilityRule;
use App\Models\Booking;
use App\Models\EventType;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

final class SlotService
{
    private const CACHE_TTL_SECONDS = 600;

    /**
     * Generate slots for a given event type and date.
     *
     * @return array<int, array{start: string, end: string, status: string}>
     */
    public function generate(EventType $eventType, Carbon $date): array
    {
        if (! $eventType->is_active) {
            return [];
        }

        $dateString = $date->format('Y-m-d');
        $cacheKey = $this->cacheTag($eventType->id, $dateString);
        $tags = $this->cacheTags($eventType->id, $dateString);

        return Cache::tags($tags)->remember(
            $cacheKey,
            self::CACHE_TTL_SECONDS,
            function () use ($eventType, $date, $dateString): array {
                $exception = AvailabilityException::query()
                    ->whereDate('date', $dateString)
                    ->where('is_closed', true)
                    ->first();

                if ($exception !== null) {
                    return [];
                }

                $rule = AvailabilityRule::query()
                    ->where('weekday', (int) $date->format('w'))
                    ->first();

                if ($rule === null) {
                    return [];
                }

                $start = Carbon::parse("{$dateString} {$rule->start_time}");
                $end = $this->roundEndTimeUp(Carbon::parse("{$dateString} {$rule->end_time}"));
                $duration = $eventType->duration_minutes;

                $bookings = $this->activeBookingsForDate($eventType->id, $dateString);

                $slots = [];
                $current = $start->copy();

                while ($current->copy()->addMinutes($duration)->lte($end)) {
                    $slotStart = $current->copy();
                    $slotEnd = $current->copy()->addMinutes($duration);

                    $slots[] = [
                        'start' => $slotStart->format('H:i'),
                        'end' => $slotEnd->format('H:i'),
                        'status' => $this->resolveSlotStatus($slotStart, $slotEnd, $bookings)->value,
                    ];

                    $current->addMinutes($duration);
                }

                return $slots;
            }
        );
    }

    public function invalidate(EventType $eventType, string $date): void
    {
        Cache::tags($this->cacheTags($eventType->id, $date))->flush();
    }

    public function invalidateForEventType(EventType $eventType): void
    {
        Cache::tags(["slots:{$eventType->id}"])->flush();
    }

    public function invalidateAll(): void
    {
        Cache::tags(['slots'])->flush();
    }

    private function cacheTag(int $eventTypeId, string $date): string
    {
        return "slots:{$eventTypeId}:{$date}";
    }

    /**
     * @return array<int, string>
     */
    private function cacheTags(int $eventTypeId, string $date): array
    {
        return [
            'slots',
            "slots:{$eventTypeId}",
            "slots:{$eventTypeId}:{$date}",
        ];
    }

    private function roundEndTimeUp(Carbon $endTime): Carbon
    {
        if ($endTime->minute === 0 && $endTime->second === 0) {
            return $endTime;
        }

        return $endTime->copy()->addHour()->startOfHour();
    }

    /**
     * @return array<int, Booking>
     */
    private function activeBookingsForDate(int $eventTypeId, string $dateString): array
    {
        return Booking::query()
            ->where('event_type_id', $eventTypeId)
            ->whereDate('date', $dateString)
            ->whereIn('status', [BookingStatus::PENDING->value, BookingStatus::CONFIRMED->value])
            ->orderBy('starts_at')
            ->get()
            ->all();
    }

    /**
     * @param  array<int, Booking>  $bookings
     */
    private function resolveSlotStatus(Carbon $slotStart, Carbon $slotEnd, array $bookings): SlotStatus
    {
        foreach ($bookings as $booking) {
            /** @var Carbon $bookingStart */
            $bookingStart = $booking->starts_at;
            /** @var Carbon $bookingEnd */
            $bookingEnd = $booking->ends_at;

            if ($bookingStart->lt($slotEnd) && $bookingEnd->gt($slotStart)) {
                return $booking->status === BookingStatus::CONFIRMED
                    ? SlotStatus::CONFIRMED
                    : SlotStatus::PENDING;
            }
        }

        return SlotStatus::FREE;
    }
}
