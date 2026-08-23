<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityException;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class ClosedDateController extends Controller
{
    public function index(): JsonResponse
    {
        $today = Carbon::today();
        $maxDate = $today->copy()->addDays(14);

        $dates = AvailabilityException::query()
            ->where('is_closed', true)
            ->whereBetween('date', [$today->startOfDay()->toDateTimeString(), $maxDate->endOfDay()->toDateTimeString()])
            ->orderBy('date')
            ->get(['date', 'is_closed', 'start_time', 'end_time'])
            ->map(function (AvailabilityException $exception) {
                return [
                    'date' => $exception->date->format('Y-m-d'),
                    'is_closed' => $exception->is_closed,
                    'start_time' => $exception->start_time,
                    'end_time' => $exception->end_time,
                ];
            });

        return response()->json(['dates' => $dates]);
    }
}
