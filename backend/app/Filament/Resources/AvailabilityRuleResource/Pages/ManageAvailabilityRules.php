<?php

declare(strict_types=1);

namespace App\Filament\Resources\AvailabilityRuleResource\Pages;

use App\Filament\Resources\AvailabilityRuleResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageAvailabilityRules extends ManageRecords
{
    protected static string $resource = AvailabilityRuleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
