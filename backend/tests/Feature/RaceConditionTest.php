<?php

declare(strict_types=1);

use App\Models\AvailabilityRule;
use App\Models\EventType;

it('prevents double booking of the same slot', function () {
    AvailabilityRule::factory()->create([
        'weekday' => bookingDate()->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $eventType = EventType::factory()->duration30()->create();
    $payload = [
        'event_type_id' => $eventType->id,
        'date' => bookingDate()->format('Y-m-d'),
        'slots' => [['start' => '10:00']],
        'guest' => ['name' => 'First', 'email' => 'first@example.com', 'phone' => '+7 (999) 000-00-00'],
    ];

    $this->postJson('/api/v1/bookings', $payload)
        ->assertCreated();

    $payload['guest'] = ['name' => 'Second', 'email' => 'second@example.com', 'phone' => '+7 (999) 000-00-01'];

    $this->postJson('/api/v1/bookings', $payload)
        ->assertStatus(400)
        ->assertJsonPath('code', 'SLOT_TAKEN');
});
