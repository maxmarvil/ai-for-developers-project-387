<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\AvailabilityException;
use App\Services\SlotService;

final class AvailabilityExceptionObserver
{
    public function __construct(private readonly SlotService $slotService) {}

    public function saved(AvailabilityException $exception): void
    {
        $this->slotService->invalidateAll();
    }

    public function deleted(AvailabilityException $exception): void
    {
        $this->slotService->invalidateAll();
    }
}
