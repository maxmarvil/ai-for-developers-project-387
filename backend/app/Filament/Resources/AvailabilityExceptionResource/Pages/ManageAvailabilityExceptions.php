<?php

declare(strict_types=1);

namespace App\Filament\Resources\AvailabilityExceptionResource\Pages;

use App\Filament\Resources\AvailabilityExceptionResource;
use Filament\Actions;
use Filament\Resources\Pages\ManageRecords;

class ManageAvailabilityExceptions extends ManageRecords
{
    protected static string $resource = AvailabilityExceptionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
