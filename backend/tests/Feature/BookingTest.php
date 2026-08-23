<?php

declare(strict_types=1);

use App\Models\AvailabilityRule;
use App\Models\Booking;
use App\Models\EventType;
use App\Models\Guest;
use Carbon\Carbon;

function bookingPayload(EventType $eventType, string $date, array $slots, array $guest): array
{
    return [
        'event_type_id' => $eventType->id,
        'date' => $date,
        'slots' => array_map(fn (string $start) => ['start' => $start], $slots),
        'guest' => $guest,
    ];
}

beforeEach(function () {
    AvailabilityRule::factory()->create([
        'weekday' => bookingDate()->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '14:00:00',
    ]);
});

it('creates a booking', function () {
    $eventType = EventType::factory()->duration30()->create();

    $response = $this->postJson('/api/v1/bookings', bookingPayload(
        $eventType,
        bookingDate()->format('Y-m-d'),
        ['10:00'],
        ['name' => 'Ivan', 'email' => 'ivan@example.com', 'phone' => '+7 (999) 000-00-00'],
    ));

    $response->assertCreated()
        ->assertJsonPath('status', 'pending')
        ->assertJsonStructure(['booking_group_id', 'status']);

    expect(Booking::count())->toBe(1);
});

it('validates request fields', function () {
    $eventType = EventType::factory()->create();

    $this->postJson('/api/v1/bookings', [
        'event_type_id' => $eventType->id,
        'date' => 'not-a-date',
        'slots' => [],
        'guest' => ['name' => '', 'email' => 'bad', 'phone' => '123'],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('code', 'VALIDATION_ERROR');
});

it('rejects booking outside the horizon', function () {
    $eventType = EventType::factory()->create();

    $this->postJson('/api/v1/bookings', bookingPayload(
        $eventType,
        Carbon::today()->format('Y-m-d'),
        ['10:00'],
        ['name' => 'Ivan', 'email' => 'ivan@example.com', 'phone' => '+7 (999) 000-00-00'],
    ))
        ->assertStatus(400)
        ->assertJsonPath('code', 'DATE_OUT_OF_RANGE');
});

it('rejects non-sequential slots', function () {
    $eventType = EventType::factory()->duration30()->create();

    $this->postJson('/api/v1/bookings', bookingPayload(
        $eventType,
        bookingDate()->format('Y-m-d'),
        ['10:00', '11:00'],
        ['name' => 'Ivan', 'email' => 'ivan@example.com', 'phone' => '+7 (999) 000-00-00'],
    ))
        ->assertStatus(400)
        ->assertJsonPath('code', 'SLOT_NOT_SEQUENTIAL');
});

it('rejects already taken slots', function () {
    $eventType = EventType::factory()->duration30()->create();
    $guest = Guest::factory()->create();

    Booking::factory()
        ->forEventType($eventType)
        ->forGuest($guest)
        ->onDate(bookingDate()->format('Y-m-d'))
        ->atTime('10:00:00')
        ->create();

    $this->postJson('/api/v1/bookings', bookingPayload(
        $eventType,
        bookingDate()->format('Y-m-d'),
        ['10:00'],
        ['name' => 'Other', 'email' => 'other@example.com', 'phone' => '+7 (999) 000-00-00'],
    ))
        ->assertStatus(400)
        ->assertJsonPath('code', 'SLOT_TAKEN');
});

it('rejects exceeding daily limit', function () {
    $eventType = EventType::factory()->duration30()->create();
    $guest = Guest::factory()->create([
        'phone' => '+7 (999) 000-00-00',
    ]);

    Booking::factory()
        ->forEventType($eventType)
        ->forGuest($guest)
        ->onDate(bookingDate()->format('Y-m-d'))
        ->atTime('09:00:00', 90)
        ->create();

    $this->postJson('/api/v1/bookings', bookingPayload(
        $eventType,
        bookingDate()->format('Y-m-d'),
        ['11:00', '11:30', '12:00'],
        ['name' => $guest->name, 'email' => $guest->email, 'phone' => $guest->phone],
    ))
        ->assertStatus(400)
        ->assertJsonPath('code', 'LIMIT_EXCEEDED');
});
