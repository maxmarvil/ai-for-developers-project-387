<?php

declare(strict_types=1);

use App\Models\Booking;
use App\Models\EventType;
use App\Models\Guest;

it('returns guest bookings for a date', function () {
    $guest = Guest::factory()->create(['email' => 'ivan@example.com']);
    $eventType = EventType::factory()->duration30()->create();

    Booking::factory()
        ->forGuest($guest)
        ->forEventType($eventType)
        ->onDate('2026-08-19')
        ->atTime('10:00:00')
        ->create();

    $response = $this->getJson('/api/v1/guest-bookings?email=ivan@example.com&date=2026-08-19');

    $response->assertOk()
        ->assertJsonCount(1, 'bookings')
        ->assertJsonPath('bookings.0.start', '10:00')
        ->assertJsonPath('bookings.0.end', '10:30');
});

it('returns empty list for unknown guest', function () {
    $response = $this->getJson('/api/v1/guest-bookings?email=unknown@example.com&date=2026-08-19');

    $response->assertOk()
        ->assertJsonCount(0, 'bookings');
});
