<?php

declare(strict_types=1);

use App\Models\Guest;
use App\Services\GuestService;

it('creates a new guest', function () {
    $service = new GuestService;

    $guest = $service->firstOrCreateByEmail(
        'ivan@example.com',
        'Ivan',
        '+7 (999) 000-00-00',
    );

    expect($guest)->toBeInstanceOf(Guest::class)
        ->and($guest->email)->toBe('ivan@example.com')
        ->and($guest->name)->toBe('Ivan')
        ->and($guest->phone)->toBe('+7 (999) 000-00-00');

    expect(Guest::count())->toBe(1);
});

it('does not update an existing guest', function () {
    $service = new GuestService;

    Guest::factory()->create([
        'email' => 'ivan@example.com',
        'name' => 'Original',
        'phone' => '+7 (111) 111-11-11',
    ]);

    $guest = $service->firstOrCreateByEmail(
        'Ivan@Example.COM',
        'New Name',
        '+7 (999) 999-99-99',
    );

    expect($guest->name)->toBe('Original')
        ->and($guest->phone)->toBe('+7 (111) 111-11-11');

    expect(Guest::count())->toBe(1);
});
