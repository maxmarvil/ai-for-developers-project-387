<?php

declare(strict_types=1);

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\ClosedDateController;
use App\Http\Controllers\Api\EventTypeController;
use App\Http\Controllers\Api\GuestBookingController;
use App\Http\Controllers\Api\SlotController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/event-types', [EventTypeController::class, 'index']);
    Route::get('/closed-dates', [ClosedDateController::class, 'index']);

    Route::middleware('throttle:slots')->group(function () {
        Route::get('/slots', [SlotController::class, 'index']);
    });

    Route::get('/guest-bookings', [GuestBookingController::class, 'index']);

    Route::middleware('throttle:bookings')->group(function () {
        Route::post('/bookings', [BookingController::class, 'store']);
    });
});
