<?php

declare(strict_types=1);

use App\Models\AvailabilityException;
use App\Models\AvailabilityRule;
use App\Models\EventType;
use Carbon\Carbon;

it('returns slots for a valid date and event type', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => bookingDate()->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $response = $this->getJson('/api/v1/slots?event_type_id='.$eventType->id.'&date='.bookingDate()->format('Y-m-d'));

    $response->assertOk()
        ->assertJsonPath('date', bookingDate()->format('Y-m-d'))
        ->assertJsonPath('event_type_id', $eventType->id)
        ->assertJsonCount(2, 'slots');
});

it('returns 404 for a closed date', function () {
    $eventType = EventType::factory()->create();
    AvailabilityException::factory()->onDate(bookingDate()->format('Y-m-d'))->create();

    $this->getJson('/api/v1/slots?event_type_id='.$eventType->id.'&date='.bookingDate()->format('Y-m-d'))
        ->assertNotFound()
        ->assertJsonPath('code', 'NOT_FOUND');
});

it('returns empty slots for an inactive event type', function () {
    $eventType = EventType::factory()->inactive()->create();

    $this->getJson('/api/v1/slots?event_type_id='.$eventType->id.'&date='.bookingDate()->format('Y-m-d'))
        ->assertOk()
        ->assertJsonCount(0, 'slots');
});

it('rejects dates outside the booking horizon', function () {
    $eventType = EventType::factory()->create();

    $this->getJson('/api/v1/slots?event_type_id='.$eventType->id.'&date='.Carbon::today()->format('Y-m-d'))
        ->assertStatus(400)
        ->assertJsonPath('code', 'DATE_OUT_OF_RANGE');

    $this->getJson('/api/v1/slots?event_type_id='.$eventType->id.'&date='.Carbon::today()->addDays(15)->format('Y-m-d'))
        ->assertStatus(400)
        ->assertJsonPath('code', 'DATE_OUT_OF_RANGE');
});
