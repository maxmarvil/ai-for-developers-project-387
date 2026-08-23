<?php

declare(strict_types=1);

use App\Models\AvailabilityException;
use Carbon\Carbon;

it('lists closed dates within the booking horizon', function () {
    $today = Carbon::today();

    AvailabilityException::factory()->onDate($today->copy()->addDay()->format('Y-m-d'))->create();
    AvailabilityException::factory()->onDate($today->copy()->addDays(15)->format('Y-m-d'))->create();

    $response = $this->getJson('/api/v1/closed-dates');

    $response->assertOk()
        ->assertJsonCount(1, 'dates')
        ->assertJsonPath('dates.0.date', $today->copy()->addDay()->format('Y-m-d'));
});
