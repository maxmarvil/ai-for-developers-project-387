<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EventType;
use Illuminate\Http\JsonResponse;

class EventTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $eventTypes = EventType::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get(['id', 'name', 'description', 'duration_minutes', 'color']);

        return response()->json($eventTypes);
    }
}
