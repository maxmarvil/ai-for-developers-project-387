<?php

declare(strict_types=1);

use App\Models\EventType;

it('limits GET /slots to 10 requests per second', function () {
    EventType::factory()->create();

    for ($i = 0; $i < 10; $i++) {
        $this->getJson('/api/v1/slots?event_type_id=1&date='.bookingDate()->format('Y-m-d'))
            ->assertOk();
    }

    $this->getJson('/api/v1/slots?event_type_id=1&date='.bookingDate()->format('Y-m-d'))
        ->assertStatus(429);
});

it('limits POST /bookings to 10 requests per minute', function () {
    EventType::factory()->create();

    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/bookings', [])
            ->assertUnprocessable();
    }

    $this->postJson('/api/v1/bookings', [])
        ->assertStatus(429);
});
