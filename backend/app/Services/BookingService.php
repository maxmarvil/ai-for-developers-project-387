<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\BookingStatus;
use App\Enums\ErrorCode;
use App\Enums\SlotStatus;
use App\Exceptions\BookingException;
use App\Models\Booking;
use App\Models\EventType;
use App\Models\Guest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Ramsey\Uuid\Uuid;

final class BookingService
{
    private const MAX_TOTAL_MINUTES = 120;

    private const LOCK_SECONDS = 10;

    private const LOCK_WAIT_SECONDS = 5;

    public function __construct(
        private readonly GuestService $guestService,
        private readonly SlotService $slotService,
    ) {}

    /**
     * @param  array<int, string>  $startTimes  List of slot start times in "HH:mm" format.
     */
    public function create(
        EventType $eventType,
        string $date,
        array $startTimes,
        array $guestData,
        ?string $comment = null,
    ): array {
        $dateCarbon = Carbon::parse($date);
        $lock = Cache::lock(
            "booking:{$eventType->id}:{$date}",
            self::LOCK_SECONDS,
        );

        $lock->block(self::LOCK_WAIT_SECONDS);

        try {
            return DB::transaction(function () use ($eventType, $date, $dateCarbon, $startTimes, $guestData, $comment) {
                $slots = $this->slotService->generate($eventType, $dateCarbon);
                $duration = $eventType->duration_minutes;

                $requestedSlots = $this->normalizeRequestedSlots($startTimes, $duration, $date);

                $this->ensureSlotsAreSequential($requestedSlots, $duration);
                $this->ensureSlotsAvailable($requestedSlots, $slots);

                $guest = $this->guestService->firstOrCreateByEmail(
                    $guestData['email'],
                    $guestData['name'],
                    $guestData['phone'] ?? null,
                );

                $this->ensureDailyLimitNotExceeded($eventType, $date, $guest, $requestedSlots);
                $this->ensureSlotsNotTaken($eventType, $date, $requestedSlots);

                $groupId = Uuid::uuid7()->toString();
                $status = BookingStatus::PENDING;

                foreach ($requestedSlots as $slot) {
                    Booking::create([
                        'event_type_id' => $eventType->id,
                        'guest_id' => $guest->id,
                        'booking_group_id' => $groupId,
                        'date' => $date,
                        'start_time' => $slot['start_time'],
                        'starts_at' => $slot['starts_at'],
                        'ends_at' => $slot['ends_at'],
                        'comment' => $comment,
                        'status' => $status->value,
                    ]);
                }

                return [
                    'booking_group_id' => $groupId,
                    'status' => $status->value,
                ];
            });
        } finally {
            $lock->release();
        }
    }

    /**
     * @param  array<int, string>  $startTimes
     * @return array<int, array{start_time: string, starts_at: string, ends_at: string}>
     */
    private function normalizeRequestedSlots(array $startTimes, int $duration, string $date): array
    {
        $starts = array_map('trim', $startTimes);
        $starts = array_unique($starts);
        sort($starts);

        $slots = [];
        foreach ($starts as $start) {
            $startCarbon = Carbon::parse("{$date} {$start}");
            $endCarbon = $startCarbon->copy()->addMinutes($duration);

            $slots[] = [
                'start_time' => $startCarbon->format('H:i:s'),
                'starts_at' => $startCarbon->toDateTimeString(),
                'ends_at' => $endCarbon->toDateTimeString(),
            ];
        }

        return $slots;
    }

    /**
     * @param  array<int, array{start_time: string, starts_at: string, ends_at: string}>  $requestedSlots
     */
    private function ensureSlotsAreSequential(array $requestedSlots, int $duration): void
    {
        $count = count($requestedSlots);

        if ($count === 0) {
            throw new BookingException(
                ErrorCode::VALIDATION_ERROR,
                'At least one slot must be selected.',
                422,
            );
        }

        for ($i = 1; $i < $count; $i++) {
            $previousEnd = Carbon::parse($requestedSlots[$i - 1]['ends_at']);
            $currentStart = Carbon::parse($requestedSlots[$i]['starts_at']);

            if (! $previousEnd->equalTo($currentStart)) {
                throw new BookingException(
                    ErrorCode::SLOT_NOT_SEQUENTIAL,
                    'Selected slots must form a continuous sequence.',
                );
            }
        }
    }

    /**
     * @param  array<int, array{start_time: string, starts_at: string, ends_at: string}>  $requestedSlots
     * @param  array<int, array{start: string, end: string, status: string}>  $availableSlots
     */
    private function ensureSlotsAvailable(array $requestedSlots, array $availableSlots): void
    {
        $availableMap = [];
        foreach ($availableSlots as $slot) {
            $availableMap[$slot['start']] = $slot['status'];
        }

        foreach ($requestedSlots as $requested) {
            $start = Carbon::parse($requested['starts_at'])->format('H:i');

            if (! array_key_exists($start, $availableMap)) {
                throw new BookingException(
                    ErrorCode::SLOT_UNAVAILABLE,
                    'One or more requested slots are outside availability periods or fall on a closed date.',
                );
            }

            if ($availableMap[$start] !== SlotStatus::FREE->value) {
                throw new BookingException(
                    ErrorCode::SLOT_TAKEN,
                    'One or more requested slots are already taken.',
                );
            }
        }
    }

    /**
     * @param  array<int, array{start_time: string, starts_at: string, ends_at: string}>  $requestedSlots
     */
    private function ensureDailyLimitNotExceeded(
        EventType $eventType,
        string $date,
        Guest $guest,
        array $requestedSlots,
    ): void {
        $existingBookings = Booking::query()
            ->where('event_type_id', $eventType->id)
            ->where('guest_id', $guest->id)
            ->whereDate('date', $date)
            ->whereIn('status', [BookingStatus::PENDING->value, BookingStatus::CONFIRMED->value])
            ->get();

        $existingMinutes = 0;
        foreach ($existingBookings as $booking) {
            $existingMinutes += $booking->starts_at->diffInMinutes($booking->ends_at);
        }

        $requestedMinutes = count($requestedSlots) * $eventType->duration_minutes;

        if (($existingMinutes + $requestedMinutes) > self::MAX_TOTAL_MINUTES) {
            throw new BookingException(
                ErrorCode::LIMIT_EXCEEDED,
                'Total booking duration for this guest exceeds the daily limit of 2 hours.',
            );
        }
    }

    /**
     * @param  array<int, array{start_time: string, starts_at: string, ends_at: string}>  $requestedSlots
     */
    private function ensureSlotsNotTaken(EventType $eventType, string $date, array $requestedSlots): void
    {
        $activeBookings = Booking::query()
            ->where('event_type_id', $eventType->id)
            ->whereDate('date', $date)
            ->whereIn('status', [BookingStatus::PENDING->value, BookingStatus::CONFIRMED->value])
            ->get();

        foreach ($requestedSlots as $requested) {
            $requestedStart = Carbon::parse($requested['starts_at']);
            $requestedEnd = Carbon::parse($requested['ends_at']);

            foreach ($activeBookings as $booking) {
                /** @var Carbon $bookingStart */
                $bookingStart = $booking->starts_at;
                /** @var Carbon $bookingEnd */
                $bookingEnd = $booking->ends_at;

                if ($bookingStart->lt($requestedEnd) && $bookingEnd->gt($requestedStart)) {
                    throw new BookingException(
                        ErrorCode::SLOT_TAKEN,
                        'One or more requested slots are already taken.',
                    );
                }
            }
        }
    }
}
