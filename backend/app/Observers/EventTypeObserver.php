<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\EventType;
use App\Services\SlotService;

final class EventTypeObserver
{
    public function __construct(private readonly SlotService $slotService) {}

    public function saved(EventType $eventType): void
    {
        $this->slotService->invalidateForEventType($eventType);
    }

    public function deleted(EventType $eventType): void
    {
        $this->slotService->invalidateForEventType($eventType);
    }
}
