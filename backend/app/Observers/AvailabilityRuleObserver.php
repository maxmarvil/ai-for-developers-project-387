<?php

declare(strict_types=1);

namespace App\Observers;

use App\Models\AvailabilityRule;
use App\Services\SlotService;

final class AvailabilityRuleObserver
{
    public function __construct(private readonly SlotService $slotService) {}

    public function saved(AvailabilityRule $rule): void
    {
        $this->slotService->invalidateAll();
    }

    public function deleted(AvailabilityRule $rule): void
    {
        $this->slotService->invalidateAll();
    }
}
