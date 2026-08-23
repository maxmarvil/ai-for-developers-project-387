<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use App\Enums\SlotStatus;
use App\Models\AvailabilityException;
use App\Models\AvailabilityRule;
use App\Models\Booking;
use App\Models\EventType;
use App\Services\SlotService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    Cache::flush();
});

it('generates free slots for an active event type', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots)->toHaveCount(2)
        ->and($slots[0])->toMatchArray(['start' => '09:00', 'end' => '09:30', 'status' => SlotStatus::FREE->value])
        ->and($slots[1])->toMatchArray(['start' => '09:30', 'end' => '10:00', 'status' => SlotStatus::FREE->value]);
});

it('returns empty slots for an inactive event type', function () {
    $eventType = EventType::factory()->inactive()->create();

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots)->toBeEmpty();
});

it('returns empty slots for a closed date', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);
    AvailabilityException::factory()->onDate('2026-08-19')->create();

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots)->toBeEmpty();
});

it('returns empty slots when no availability rule exists', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots)->toBeEmpty();
});

it('rounds end time up to the full hour', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '09:45:00',
    ]);

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots)->toHaveCount(2)
        ->and(last($slots)['end'])->toBe('10:00');
});

it('marks booked slots as pending', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '11:00:00',
    ]);

    Booking::factory()
        ->forEventType($eventType)
        ->onDate('2026-08-19')
        ->atTime('09:30:00')
        ->status(BookingStatus::PENDING)
        ->create();

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    $statuses = collect($slots)->pluck('status')->all();

    expect($statuses)->toBe([
        SlotStatus::FREE->value,
        SlotStatus::PENDING->value,
        SlotStatus::FREE->value,
        SlotStatus::FREE->value,
    ]);
});

it('marks confirmed bookings as confirmed', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    Booking::factory()
        ->forEventType($eventType)
        ->onDate('2026-08-19')
        ->atTime('09:00:00')
        ->confirmed()
        ->create();

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots[0]['status'])->toBe(SlotStatus::CONFIRMED->value);
});

it('ignores cancelled bookings', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    Booking::factory()
        ->forEventType($eventType)
        ->onDate('2026-08-19')
        ->atTime('09:00:00')
        ->cancelled()
        ->create();

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots[0]['status'])->toBe(SlotStatus::FREE->value);
});

it('ignores soft deleted bookings', function () {
    $eventType = EventType::factory()->create(['duration_minutes' => 30]);
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    Booking::factory()
        ->forEventType($eventType)
        ->onDate('2026-08-19')
        ->atTime('09:00:00')
        ->confirmed()
        ->create()
        ->delete();

    $service = new SlotService;
    $slots = $service->generate($eventType, Carbon::parse('2026-08-19'));

    expect($slots[0]['status'])->toBe(SlotStatus::FREE->value);
});
