<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\AvailabilityException;
use App\Models\AvailabilityRule;
use App\Models\Booking;
use App\Models\EventType;
use App\Observers\AvailabilityExceptionObserver;
use App\Observers\AvailabilityRuleObserver;
use App\Observers\BookingObserver;
use App\Observers\EventTypeObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
        $this->configureObservers();
        $this->configureGates();
    }

    private function configureGates(): void
    {
        Gate::before(function ($user, $ability): ?bool {
            if (Auth::check() && $user->isSuperAdmin()) {
                return true;
            }

            return null;
        });
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('slots', function (Request $request): Limit {
            return Limit::perSecond(10)->by($request->ip() ?? 'global');
        });

        RateLimiter::for('bookings', function (Request $request): Limit {
            return Limit::perMinute(10)->by($request->ip() ?? 'global');
        });
    }

    private function configureObservers(): void
    {
        Booking::observe(BookingObserver::class);
        AvailabilityRule::observe(AvailabilityRuleObserver::class);
        AvailabilityException::observe(AvailabilityExceptionObserver::class);
        EventType::observe(EventTypeObserver::class);
    }
}
