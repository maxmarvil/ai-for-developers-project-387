<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use App\Enums\ErrorCode;
use App\Exceptions\BookingException;
use App\Models\AvailabilityException;
use App\Models\AvailabilityRule;
use App\Models\Booking;
use App\Models\EventType;
use App\Models\Guest;
use App\Services\BookingService;
use App\Services\GuestService;
use App\Services\SlotService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    Cache::flush();
});

function makeBookingService(): BookingService
{
    return new BookingService(new GuestService, new SlotService);
}

it('creates a booking group for sequential slots', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $service = makeBookingService();

    $result = $service->create(
        $eventType,
        '2026-08-19',
        ['10:00', '10:30'],
        ['email' => 'ivan@example.com', 'name' => 'Ivan', 'phone' => '+7 (999) 000-00-00'],
    );

    expect($result)->toHaveKeys(['booking_group_id', 'status'])
        ->and($result['status'])->toBe(BookingStatus::PENDING->value)
        ->and(Booking::count())->toBe(2);

    $groupId = $result['booking_group_id'];
    expect(Booking::where('booking_group_id', $groupId)->count())->toBe(2);
});

it('throws when slots are not sequential', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    $service = makeBookingService();

    expect(fn () => $service->create(
        $eventType,
        '2026-08-19',
        ['10:00', '11:00'],
        ['email' => 'ivan@example.com', 'name' => 'Ivan', 'phone' => '+7 (999) 000-00-00'],
    ))->toThrow(BookingException::class);

    try {
        $service->create(
            $eventType,
            '2026-08-19',
            ['10:00', '11:00'],
            ['email' => 'ivan@example.com', 'name' => 'Ivan', 'phone' => '+7 (999) 000-00-00'],
        );
    } catch (BookingException $e) {
        expect($e->getErrorCode())->toBe(ErrorCode::SLOT_NOT_SEQUENTIAL);
    }
});

it('throws when a slot is unavailable', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $service = makeBookingService();

    try {
        $service->create(
            $eventType,
            '2026-08-19',
            ['11:00'],
            ['email' => 'ivan@example.com', 'name' => 'Ivan', 'phone' => '+7 (999) 000-00-00'],
        );
    } catch (BookingException $e) {
        expect($e->getErrorCode())->toBe(ErrorCode::SLOT_UNAVAILABLE);
    }
});

it('throws when a slot is already taken', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
    ]);

    Booking::factory()
        ->forEventType($eventType)
        ->onDate('2026-08-19')
        ->atTime('10:00:00')
        ->create();

    $service = makeBookingService();

    try {
        $service->create(
            $eventType,
            '2026-08-19',
            ['10:00'],
            ['email' => 'other@example.com', 'name' => 'Other', 'phone' => '+7 (999) 000-00-00'],
        );
    } catch (BookingException $e) {
        expect($e->getErrorCode())->toBe(ErrorCode::SLOT_TAKEN);
    }
});

it('throws when daily limit is exceeded', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '14:00:00',
    ]);

    $guest = Guest::factory()->create();

    // 3 slots = 90 minutes
    Booking::factory()
        ->forEventType($eventType)
        ->forGuest($guest)
        ->onDate('2026-08-19')
        ->atTime('09:00:00', 90)
        ->create();

    $service = makeBookingService();

    try {
        $service->create(
            $eventType,
            '2026-08-19',
            ['11:00', '11:30', '12:00'],
            ['email' => $guest->email, 'name' => $guest->name, 'phone' => $guest->phone],
        );
    } catch (BookingException $e) {
        expect($e->getErrorCode())->toBe(ErrorCode::LIMIT_EXCEEDED);
    }
});

it('reuses an existing guest', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    Guest::factory()->create([
        'email' => 'ivan@example.com',
        'name' => 'Original',
        'phone' => '+7 (111) 111-11-11',
    ]);

    $service = makeBookingService();

    $service->create(
        $eventType,
        '2026-08-19',
        ['09:00'],
        ['email' => 'ivan@example.com', 'name' => 'New Name', 'phone' => '+7 (999) 999-99-99'],
    );

    expect(Guest::count())->toBe(1);
});

it('rejects a booking on a closed date even when the slot cache is stale', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $slotService = new SlotService;

    $slotService->generate($eventType, Carbon::parse('2026-08-19'));

    DB::table('availability_exceptions')->insert([
        'date' => '2026-08-19',
        'is_closed' => true,
        'start_time' => null,
        'end_time' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $service = new BookingService(new GuestService, $slotService);

    $thrown = null;

    try {
        $service->create(
            $eventType,
            '2026-08-19',
            ['09:00'],
            ['email' => 'ivan@example.com', 'name' => 'Ivan', 'phone' => '+7 (999) 000-00-00'],
        );
    } catch (BookingException $e) {
        $thrown = $e;
    }

    expect($thrown)->not->toBeNull()
        ->and($thrown->getErrorCode())->toBe(ErrorCode::SLOT_UNAVAILABLE)
        ->and(Booking::count())->toBe(0);
});

it('still allows a booking once the closed exception is removed', function () {
    $eventType = EventType::factory()->duration30()->create();
    AvailabilityRule::factory()->create([
        'weekday' => Carbon::parse('2026-08-19')->format('w'),
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $service = makeBookingService();

    $exception = AvailabilityException::factory()->onDate('2026-08-19')->create();
    $exception->delete();

    $result = $service->create(
        $eventType,
        '2026-08-19',
        ['09:00'],
        ['email' => 'ivan@example.com', 'name' => 'Ivan', 'phone' => '+7 (999) 000-00-00'],
    );

    expect($result['status'])->toBe(BookingStatus::PENDING->value)
        ->and(Booking::count())->toBe(1);
});
