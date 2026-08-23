<?php

declare(strict_types=1);

use App\Models\EventType;

it('lists active event types sorted by id', function () {
    EventType::factory()->create(['name' => 'A', 'is_active' => true]);
    EventType::factory()->create(['name' => 'B', 'is_active' => false]);
    EventType::factory()->create(['name' => 'C', 'is_active' => true]);

    $response = $this->getJson('/api/v1/event-types');

    $response->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.name', 'A')
        ->assertJsonPath('1.name', 'C');
});
