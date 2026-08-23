<?php

declare(strict_types=1);

namespace App\Filament\Widgets;

use App\Models\Booking;
use App\Models\EventType;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class TodayBookingsWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $today = Carbon::today()->format('Y-m-d');

        return [
            Stat::make('Bookings today', Booking::query()->whereDate('date', $today)->count()),
            Stat::make('Pending bookings', Booking::query()->where('status', 'pending')->count()),
            Stat::make('Event types', EventType::query()->where('is_active', true)->count()),
        ];
    }
}
