<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\EventType;
use App\Models\Guest;
use Illuminate\Database\Eloquent\Factories\Factory;
use Ramsey\Uuid\Uuid;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        $date = $this->faker->dateTimeBetween('+1 day', '+14 days')->format('Y-m-d');
        $start = '10:00:00';
        $duration = 30;

        return [
            'event_type_id' => EventType::factory(),
            'guest_id' => Guest::factory(),
            'booking_group_id' => Uuid::uuid7()->toString(),
            'date' => $date,
            'start_time' => $start,
            'starts_at' => "{$date} {$start}",
            'ends_at' => "{$date} 10:30:00",
            'comment' => $this->faker->optional()->sentence(),
            'status' => BookingStatus::PENDING->value,
        ];
    }

    public function forEventType(EventType $eventType): static
    {
        return $this->state(fn () => ['event_type_id' => $eventType->id]);
    }

    public function forGuest(Guest $guest): static
    {
        return $this->state(fn () => ['guest_id' => $guest->id]);
    }

    public function onDate(string $date): static
    {
        return $this->state(fn (array $attributes) => [
            'date' => $date,
            'starts_at' => "{$date} {$attributes['start_time']}",
            'ends_at' => "{$date} ".date('H:i:s', strtotime($attributes['starts_at'].' +30 minutes')),
        ]);
    }

    public function atTime(string $startTime, int $durationMinutes = 30): static
    {
        return $this->state(fn (array $attributes) => [
            'start_time' => $startTime,
            'starts_at' => "{$attributes['date']} {$startTime}",
            'ends_at' => date('Y-m-d H:i:s', strtotime("{$attributes['date']} {$startTime} +{$durationMinutes} minutes")),
        ]);
    }

    public function status(BookingStatus $status): static
    {
        return $this->state(fn () => ['status' => $status->value]);
    }

    public function inGroup(string $groupId): static
    {
        return $this->state(fn () => ['booking_group_id' => $groupId]);
    }

    public function cancelled(): static
    {
        return $this->status(BookingStatus::CANCELLED);
    }

    public function confirmed(): static
    {
        return $this->status(BookingStatus::CONFIRMED);
    }
}
