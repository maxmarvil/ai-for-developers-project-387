<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SlotIndexRequest;
use App\Models\AvailabilityException;
use App\Models\EventType;
use App\Services\SlotService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class SlotController extends Controller
{
    public function __construct(private readonly SlotService $slotService) {}

    public function index(SlotIndexRequest $request): JsonResponse
    {
        $eventType = EventType::findOrFail($request->integer('event_type_id'));
        $date = Carbon::parse($request->input('date'));
        $dateString = $date->format('Y-m-d');

        if (! $eventType->is_active) {
            return response()->json([
                'date' => $dateString,
                'event_type_id' => $eventType->id,
                'slots' => [],
            ]);
        }

        $isClosed = AvailabilityException::query()
            ->whereDate('date', $dateString)
            ->where('is_closed', true)
            ->exists();

        if ($isClosed) {
            throw new NotFoundHttpException('The requested date is closed for booking.');
        }

        $slots = $this->slotService->generate($eventType, $date);

        return response()->json([
            'date' => $dateString,
            'event_type_id' => $eventType->id,
            'slots' => $slots,
        ]);
    }
}
